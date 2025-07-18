'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  DocumentPlusIcon, 
  DocumentTextIcon, 
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navigation: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'New Note', href: '/notes/new', icon: DocumentPlusIcon },
  { name: 'Notes History', href: '/notes', icon: DocumentTextIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-purple-400 overflow-y-auto sidebar-scrollbar">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-purple-400">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-emerald-600 dark:bg-purple-400 rounded-lg flex items-center justify-center">
            <span className="text-white dark:text-black font-bold text-lg">S</span>
          </div>
          <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-purple-400">Scribsy</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md border-2 transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-500 dark:bg-purple-900 dark:text-purple-400 dark:border-purple-400'
                  : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 border-transparent hover:border-emerald-200 dark:text-purple-300 dark:hover:bg-purple-900 dark:hover:text-purple-400 dark:hover:border-purple-400'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-emerald-600 dark:text-purple-400' : 'text-gray-400 group-hover:text-emerald-600 dark:text-purple-300 dark:group-hover:text-green-400'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-purple-400">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-emerald-200 dark:bg-purple-400 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-emerald-700 dark:text-black">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700 dark:text-purple-400">
              {user?.username}
            </p>
            <button
              onClick={logout}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-purple-300 dark:hover:text-purple-400"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};