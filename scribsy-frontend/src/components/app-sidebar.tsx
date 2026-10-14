"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CalendarDays,
  FileText,
  Settings,
  Mic,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { needsReview } from "@/lib/dashboard";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import styles from "./app-sidebar.module.css";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Review queue", href: "/notes?filter=review", icon: ClipboardList },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
  { name: "Notes history", href: "/notes", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar({ preview = false }: { preview?: boolean }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [reviewActive, setReviewActive] = useState(false);
  useEffect(() => {
    setOpen(false);
    setReviewActive(
      pathname === "/notes" &&
        new URLSearchParams(window.location.search).get("filter") === "review",
    );
    if (user && pathname !== "/dashboard") {
      apiClient
        .getDashboard()
        .then((data) => setCount(data.notes.filter(needsReview).length))
        .catch(() => {});
    }
  }, [pathname, user]);
  useEffect(() => {
    const onCount = (event: Event) =>
      setCount((event as CustomEvent<number>).detail);
    window.addEventListener("scribsy:review-count", onCount);
    return () => window.removeEventListener("scribsy:review-count", onCount);
  }, []);
  const destination = (href: string) => (preview ? "/login" : href);
  return (
    <>
      <div className={styles.mobileBar}>
        <Link href="/dashboard" className={styles.brand}>
          <span>S</span>Scribsy
        </Link>
        <div className={styles.mobileActions}>
          <ThemeToggle compact />
          <button
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="workspace-navigation"
            onClick={() => setOpen((previous) => !previous)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <button
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        className={`${styles.sidebar} ${open ? styles.open : ""}`}
        aria-label="Workspace navigation"
      >
        <Link href="/dashboard" className={styles.brand}>
          <span>S</span>Scribsy
        </Link>
        <Link
          className={styles.newNote}
          href={
            user?.is_demo
              ? "/sample-visit"
              : destination("/notes/new?mode=record")
          }
          onClick={() => setOpen(false)}
        >
          <Mic size={16} />
          {user?.is_demo ? "Try sample visit" : "New note"}
        </Link>
        <nav>
          {navigation.map((item) => {
            const active =
              item.name === "Review queue"
                ? reviewActive
                : item.href === "/notes"
                  ? pathname === "/notes" && !reviewActive
                  : pathname === item.href ||
                    (item.href === "/patients" &&
                      pathname.startsWith("/patients/"));
            return (
              <Link
                key={item.name}
                className={active ? styles.active : ""}
                href={
                  preview && item.href !== "/dashboard" ? "/login" : item.href
                }
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setOpen(false);
                  setReviewActive(item.name === "Review queue");
                }}
              >
                <item.icon size={17} />
                <span>{item.name}</span>
                {item.name === "Review queue" && (preview || count > 0) && (
                  <b>{preview ? 3 : count}</b>
                )}
              </Link>
            );
          })}
        </nav>
        <div className={styles.themeControls}>
          <ThemeToggle />
        </div>
        <div className={styles.account}>
          <span className={styles.avatar}>
            {preview ? "T" : user?.username.charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{preview ? "Dr. Taylor" : user?.username}</strong>
            <small>
              {preview || user?.is_demo
                ? "Sample workspace"
                : "Clinical workspace"}
            </small>
          </div>
          <button
            aria-label={preview ? "Sign in" : "Log out"}
            onClick={() => (preview ? router.push("/login") : logout())}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
