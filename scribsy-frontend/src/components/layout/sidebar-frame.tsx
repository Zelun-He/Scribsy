"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import Link from "next/link";

export function SidebarFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const isPublic =
    [
      "/",
      "/sample-visit",
      "/login",
      "/register",
      "/contact",
      "/benefits",
      "/access-denied",
    ].includes(pathname) || pathname.startsWith("/auth/");
  if (isPublic || loading || !user) return <>{children}</>;
  const demoPage =
    ["/dashboard", "/notes", "/patients", "/schedule"].includes(pathname) ||
    /^\/(notes|patients)\/\d+$/.test(pathname);
  return (
    <div className="workspace-shell">
      <AppSidebar />
      <main className="workspace-main">
        {user.is_demo && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-6 py-3 text-sm text-blue-900">
            <span>Demo workspace · Fictional data · View-only</span>
            <button className="font-semibold underline" onClick={logout}>
              Exit demo
            </button>
          </div>
        )}
        {user.is_demo && !demoPage ? (
          <div className="p-8 max-w-xl">
            <h1 className="text-2xl font-semibold">
              Explore the sample workspace
            </h1>
            <p className="my-4">
              This shared demo is view-only. Try editing and exporting the
              sample visit, or exit the demo and create an account to save your
              own visits.
            </p>
            <Link
              className="button-secondary inline-block rounded-md px-4 py-3"
              href="/sample-visit"
            >
              Try the sample visit
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
