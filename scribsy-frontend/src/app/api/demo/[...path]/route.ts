import { NextRequest, NextResponse } from "next/server";
import { DEMO_TOKEN, DEMO_USER, demoDashboard } from "@/lib/demo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const readonlyMessage =
  "This demo workspace is view-only. Create an account to save your own visits.";
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function demoSession(request: NextRequest) {
  const response = json({ access_token: DEMO_TOKEN, token_type: "bearer" });
  response.cookies.set("auth_token", DEMO_TOKEN, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
async function handle(request: NextRequest) {
  const path = request.nextUrl.pathname
    .slice("/api/demo".length)
    .replace(/\/$/, "");
  const method = request.method;
  const enabled = process.env.DEMO_ENABLED !== "false";
  if (path === "/auth/logout" && method === "POST") {
    const response = json({ message: "Logged out" });
    response.cookies.delete("auth_token");
    response.cookies.delete("csrf_token");
    return response;
  }
  if (path === "/auth/demo" && method === "POST") {
    return enabled
      ? demoSession(request)
      : json({ detail: "The public demo is disabled." }, 503);
  }
  if (
    ["/auth/token", "/auth/token-cookie"].includes(path) &&
    method === "POST"
  ) {
    const body = await request.arrayBuffer();
    const form = new URLSearchParams(new TextDecoder().decode(body));
    const username = form.get("username")?.trim().toLowerCase();
    if (["testuser", "public-demo@scribsy.example"].includes(username || "")) {
      if (!enabled)
        return json({ detail: "The public demo is disabled." }, 503);
      return form.get("password") === "123456"
        ? demoSession(request)
        : json({ detail: "Incorrect password" }, 401);
    }
    return json(
      { detail: "Use the regular sign-in form for your own account." },
      401,
    );
  }
  const header = request.headers.get("authorization");
  const token = header
    ? header.replace(/^Bearer\s+/i, "")
    : request.cookies.get("auth_token")?.value;
  if (token !== DEMO_TOKEN)
    return json({ detail: "Demo session required." }, 401);
  if (!enabled) return json({ detail: "The public demo is disabled." }, 403);
  if (path === "/auth/refresh" && method === "POST")
    return demoSession(request);
  if (!["GET", "HEAD"].includes(method))
    return json({ detail: readonlyMessage }, 403);
  if (path === "/auth/me") return json(DEMO_USER);
  const data = demoDashboard();
  const params = request.nextUrl.searchParams;
  if (path === "/dashboard") return json(data);
  if (path === "/patients") {
    const search = (params.get("search") || "").toLowerCase();
    return json(
      data.patients.filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(search),
      ),
    );
  }
  if (path === "/patients/appointments/upcoming")
    return json(data.appointments);
  const patientMatch = path.match(/^\/patients\/(\d+)(\/appointments)?$/);
  if (patientMatch) {
    const patient = data.patients.find((p) => p.id === Number(patientMatch[1]));
    if (!patient) return json({ detail: "Patient not found" }, 404);
    return json(
      patientMatch[2]
        ? data.appointments.filter((a) => a.patient_id === patient.id)
        : patient,
    );
  }
  if (path === "/notes") {
    let notes = data.notes;
    for (const key of [
      "patient_id",
      "visit_id",
      "note_type",
      "status",
    ] as const) {
      const value = params.get(key);
      if (value !== null)
        notes = notes.filter((note) => String(note[key]) === value);
    }
    const skip = Math.max(0, Number(params.get("skip")) || 0);
    const limit = Math.max(0, Number(params.get("limit") ?? 100) || 0);
    return json(notes.slice(skip, skip + limit));
  }
  const noteMatch = path.match(
    /^\/notes\/(\d+)(?:\/(history|codes|provenance|comments|export\/(?:pdf|plain|ccd|audio)))?$/,
  );
  if (noteMatch) {
    const note = data.notes.find((n) => n.id === Number(noteMatch[1]));
    if (!note) return json({ detail: "Note not found" }, 404);
    const action = noteMatch[2];
    if (!action) return json(note);
    if (["history", "codes", "provenance", "comments"].includes(action))
      return json([]);
    if (action === "export/plain")
      return new NextResponse(
        `FICTIONAL SCRIBSY DEMO / NOTE ${note.id}\n\n${note.content}`,
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    if (action === "export/ccd") {
      const escape = (s: string) =>
        s.replace(
          /[<>&"']/g,
          (c) =>
            ({
              "<": "&lt;",
              ">": "&gt;",
              "&": "&amp;",
              '"': "&quot;",
              "'": "&apos;",
            })[c]!,
        );
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><ClinicalDocument xmlns="urn:hl7-org:v3"><title>Fictional Scribsy demo</title><component><structuredBody><component><section><title>Clinical note</title><text>${escape(note.content)}</text></section></component></structuredBody></component></ClinicalDocument>`,
        {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (action === "export/pdf") {
      try {
        const { demoNotePDF } = await import("@/lib/server/demo-pdf");
        return new NextResponse(await demoNotePDF(note), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="scribsy-demo-note-${note.id}.pdf"`,
            "Cache-Control": "no-store",
          },
        });
      } catch (error) {
        console.error(
          "Demo PDF export failed",
          error instanceof Error ? error.message : "Unknown error",
        );
        return json(
          { detail: "Demo PDF export failed. Please try again." },
          503,
        );
      }
    }
    return json(
      { detail: "No audio is attached to this fictional visit." },
      404,
    );
  }
  // Never forward a public demo token to the real-account backend.
  return json({ detail: readonlyMessage }, 403);
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as HEAD,
  handle as OPTIONS,
};
