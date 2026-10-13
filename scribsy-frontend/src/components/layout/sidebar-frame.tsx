"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

export function SidebarFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
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
  return (
    <div className="workspace-shell">
      <AppSidebar />
      <main className="workspace-main">{children}</main>
    </div>
  );
}
