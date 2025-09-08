'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  DocumentPlusIcon, 
  DocumentTextIcon, 
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/logo';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navigation: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Patients', href: '/patients', icon: UserGroupIcon },
  { name: 'New Note', href: '/notes/new', icon: DocumentPlusIcon },
  { name: 'Notes History', href: '/notes', icon: DocumentTextIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-r"
      style={{ borderColor: 'var(--sidebar-border)' }}
      aria-label="Sidebar"
    >
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <Logo size="md" />
          <span className="ml-2 text-xl font-semibold" style={{ color: 'var(--sidebar-foreground)' }}>Scribsy</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto sidebar-scrollbar">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]'
                  : 'hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0`}
                style={{ color: isActive ? 'var(--sidebar-ring)' : 'var(--sidebar-foreground)' }}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--sidebar-accent)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--sidebar-foreground)' }}>
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium" style={{ color: 'var(--sidebar-foreground)' }}>
              {user?.username}
            </p>
            <button
              onClick={logout}
              className="flex items-center text-sm"
              style={{ color: 'var(--sidebar-foreground)' }}
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};