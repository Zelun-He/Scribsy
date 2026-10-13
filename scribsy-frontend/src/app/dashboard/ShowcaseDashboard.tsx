import Link from "next/link";
import AuthenticatedDashboard from "./AuthenticatedDashboard";
import { AppSidebar } from "@/components/app-sidebar";

export default function ShowcaseDashboard() {
  return (
    <div className="workspace-shell">
      <AppSidebar preview />
      <main className="workspace-main">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs text-emerald-900">
          <Link href="/" className="font-semibold hover:underline">
            ← Back to Scribsy
          </Link>
          <span>
            Dashboard preview · Sample data only ·{" "}
            <Link href="/login" className="font-semibold underline">
              Sign in to use your workspace
            </Link>
          </span>
        </div>
        <AuthenticatedDashboard preview />
      </main>
    </div>
  );
}
