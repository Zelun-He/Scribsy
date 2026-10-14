import assert from "node:assert/strict";
import { test } from "node:test";
import { apiClient } from "../src/lib/api";
import { NextRequest } from "next/server";
import { GET, POST, PUT, DELETE } from "../src/app/api/demo/[...path]/route";
import { DEMO_TOKEN } from "../src/lib/demo-data";

function request(
  path: string,
  method = "GET",
  token = DEMO_TOKEN,
  body?: string,
) {
  return new NextRequest(`http://scribsy.test/api/demo${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });
}

test("demo session and fictional records never call the upstream backend", async () => {
  let upstreamRequests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    upstreamRequests++;
    throw new Error("The demo must not contact the backend");
  };
  const login = await POST(request("/auth/demo", "POST", ""));
  assert.equal((await login.json()).access_token, DEMO_TOKEN);
  assert.match(login.headers.get("set-cookie")!, /HttpOnly/);
  const cookieMe = await GET(
    new NextRequest("http://scribsy.test/api/demo/auth/me", {
      headers: { cookie: `auth_token=${DEMO_TOKEN}` },
    }),
  );
  assert.equal((await cookieMe.json()).is_demo, true);
  const dashboard = await (await GET(request("/dashboard"))).json();
  assert.equal(dashboard.patients.length, 3);
  assert.equal(dashboard.notes.length, 6);
  assert.equal(dashboard.appointments.length, 3);
  assert.equal((await GET(request("/patients/999999"))).status, 404);
  assert.equal((await GET(request("/notes/999999"))).status, 404);
  const patientId = dashboard.patients[0].id;
  const notes = await (
    await GET(request(`/notes?patient_id=${patientId}`))
  ).json();
  assert.ok(
    notes.every(
      (note: { patient_id: number }) => note.patient_id === patientId,
    ),
  );
  assert.equal((await GET(request("/admin/users"))).status, 403);
  assert.equal(
    (
      await PUT(
        request("/notes/101", "PUT", DEMO_TOKEN, '{"content":"Forbidden"}'),
      )
    ).status,
    403,
  );
  assert.equal((await DELETE(request("/patients/201", "DELETE"))).status, 403);
  assert.equal(
    (
      await POST(
        request(
          "/notes/summarize-text",
          "POST",
          DEMO_TOKEN,
          '{"text":"Do not run AI"}',
        ),
      )
    ).status,
    403,
  );
  assert.equal(upstreamRequests, 0);
  globalThis.fetch = originalFetch;
});

test("manual demo credentials are checked locally and can be disabled", async () => {
  const login = (password: string) =>
    POST(
      new NextRequest("http://scribsy.test/api/demo/auth/token", {
        method: "POST",
        body: new URLSearchParams({ username: " TESTUSER ", password }),
      }),
    );
  assert.equal((await login("wrong")).status, 401);
  assert.equal((await login("123456")).status, 200);
  process.env.DEMO_ENABLED = "false";
  try {
    assert.equal((await login("123456")).status, 503);
    assert.equal((await GET(request("/dashboard"))).status, 403);
  } finally {
    delete process.env.DEMO_ENABLED;
  }
});

test("the client scopes demo traffic separately and preserves the ordinary API proxy", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return Response.json(
      String(url).endsWith("/dashboard")
        ? { patients: [], notes: [], appointments: [] }
        : {
            access_token: String(url).includes("/api/demo/")
              ? DEMO_TOKEN
              : "regular-token",
            token_type: "bearer",
          },
    );
  };
  try {
    apiClient.clearToken();
    await apiClient.login({
      username: "regular-user",
      password: "fictional-password",
    });
    await apiClient.getDashboard();
    await apiClient.loginDemo();
    await apiClient.getDashboard();
    assert.deepEqual(requests, [
      "/api/auth/token",
      "/api/dashboard",
      "/api/demo/auth/demo",
      "/api/demo/dashboard",
    ]);
  } finally {
    apiClient.clearToken();
    globalThis.fetch = originalFetch;
  }
});

test("missing demo credentials are rejected and logout clears the session", async () => {
  const response = await GET(
    new NextRequest("http://scribsy.test/api/demo/auth/me"),
  );
  assert.equal(response.status, 401);
  const logout = await POST(request("/auth/logout", "POST"));
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie")!, /auth_token=;/);
});
