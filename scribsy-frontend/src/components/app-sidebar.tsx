'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Sidebar,
  SidebarHeader, 
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
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

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <Logo size="md" />
            {!collapsed && (
              <span className="ml-2 text-xl font-semibold text-[var(--sidebar-foreground)]">
                Scribsy
              </span>
            )}
          </div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.href}
                        className={`${
                          isActive
                            ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]'
                            : 'hover:bg-[var(--sidebar-accent)]'
                        }`}
                        title={collapsed ? item.name : ''}
                      >
                        <item.icon
                          className="h-5 w-5 flex-shrink-0"
                          style={{ 
                            color: isActive ? 'var(--sidebar-ring)' : 'var(--sidebar-foreground)' 
                          }}
                        />
                        {!collapsed && <span>{item.name}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[var(--sidebar-accent)] flex items-center justify-center">
              <span className="text-sm font-medium text-[var(--sidebar-foreground)]">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          {!collapsed && (
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-[var(--sidebar-foreground)] truncate">
                {user?.username}
              </p>
              <button
                onClick={logout}
                className="flex items-center text-xs text-[var(--sidebar-foreground)] hover:text-[var(--sidebar-accent-foreground)] transition-colors"
                title="Logout"
              >
                <ArrowLeftOnRectangleIcon className="w-3 h-3 mr-1" />
                Logout
              </button>
            </div>
          )}
          {collapsed && (
            <button
              onClick={logout}
              className="ml-2 p-1 hover:bg-[var(--sidebar-accent)] rounded"
              title="Logout"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4 text-[var(--sidebar-foreground)]" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}


