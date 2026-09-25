import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AuthenticatedDashboard from './AuthenticatedDashboard';
import { AppSidebar } from '@/components/app-sidebar';

export default function ShowcaseDashboard() {
  return <div className="flex h-screen bg-[var(--background-pattern)]">
    <AppSidebar />
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        <Link href="/" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft size={14} /> Back to Scribsy</Link>
        <span>Dashboard preview · Sample data only</span>
      </div>
      <main className="flex-1 overflow-y-auto p-6">
        <AuthenticatedDashboard preview />
      </main>
    </div>
  </div>;
}
