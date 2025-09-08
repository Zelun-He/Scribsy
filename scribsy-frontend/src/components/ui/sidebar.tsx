'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const value = useMemo(
    () => ({ collapsed, toggle: () => setCollapsed((v) => !v) }),
    [collapsed]
  );
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
};

export const Sidebar: React.FC<{ children: React.ReactNode } & React.HTMLAttributes<HTMLElement>> = ({ children, className = '', ...rest }) => {
  const { collapsed } = useSidebar();
  // Hide the sidebar entirely when collapsed
  if (collapsed) {
    return null;
  }
  return (
    <aside
      className={`w-64 transition-all duration-300 ease-in-out flex flex-col border-r ${className}`}
      style={{
        background: 'var(--sidebar)',
        color: 'var(--sidebar-foreground)',
        borderColor: 'var(--sidebar-border)'
      }}
      aria-label="Sidebar"
      {...rest}
    >
      {children}
    </aside>
  );
};

export const SidebarHeader: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { collapsed } = useSidebar();
  return (
    <div 
      className={`h-16 border-b flex items-center ${collapsed ? 'px-2 justify-center' : 'px-4'}`}
      style={{ borderColor: 'var(--sidebar-border)' }}
    >
      {children}
    </div>
  );
};

export const SidebarContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 overflow-y-auto px-2 py-4 sidebar-scrollbar">{children}</div>
);

export const SidebarFooter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { collapsed } = useSidebar();
  return (
    <div 
      className={`${collapsed ? 'p-2' : 'p-4'} border-t`}
      style={{ borderColor: 'var(--sidebar-border)' }}
    >
      {children}
    </div>
  );
};

export const SidebarGroup: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="mb-4">{children}</div>
);

export const SidebarGroupLabel: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="px-2 pb-2 text-xs font-semibold tracking-wide" style={{ color: 'var(--sidebar-foreground)' }}>
    {children}
  </div>
);

export const SidebarGroupContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="space-y-1">{children}</div>
);

export const SidebarMenu: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ul className="space-y-1">{children}</ul>
);

export const SidebarMenuItem: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <li>{children}</li>
);

type SidebarMenuButtonProps = {
  asChild?: boolean;
  children?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const SidebarMenuButton: React.FC<SidebarMenuButtonProps> = ({ asChild, children, className = '', ...rest }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      className: `${(children as any).props?.className ?? ''} group flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-[var(--sidebar-accent)]`.trim(),
      style: { color: 'var(--sidebar-foreground)' },
    });
  }
  return (
    <button
      className={`group flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-[var(--sidebar-accent)] ${className}`}
      style={{ color: 'var(--sidebar-foreground)' }}
      {...rest}
    >
      {children}
    </button>
  );
};

export const SidebarTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...rest }) => {
  const { toggle, collapsed } = useSidebar();
  return (
    <button
      aria-label="Toggle sidebar"
      onClick={toggle}
      className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${className}`}
      style={{
        backgroundColor: 'transparent',
        color: 'var(--sidebar-foreground)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      {...rest}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {collapsed ? (
          // Expand icon (menu/hamburger)
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        ) : (
          // Collapse icon (X)
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        )}
      </svg>
    </button>
  );
};

export const SidebarFloatingTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...rest }) => {
  const { toggle } = useSidebar();
  return (
    <button
      aria-label="Open sidebar"
      onClick={toggle}
      className={`fixed left-4 top-4 z-50 p-3 rounded-full shadow-md bg-emerald-600 text-white hover:bg-emerald-700 ${className}`}
      {...rest}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
};


