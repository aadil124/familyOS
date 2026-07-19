"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useHealthQuery } from "@/features/dashboard/services/queries";
import { Loader } from "@/components/ui/Loader";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { WorkspaceSwitcher } from "@/features/dashboard/components/WorkspaceSwitcher";
import { NotificationList } from "@/features/dashboard/components/NotificationList";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  FolderLock,
  CalendarCheck2,
  MessageSquareCode,
  BellRing,
  Settings2,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Search,
  Sun,
  Moon,
  FolderHeart,
  Sparkles,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { data: health } = useHealthQuery();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Load and apply theme
  useEffect(() => {
    const savedTheme = (localStorage.getItem("familyos_theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Toggle dark/light theme
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("familyos_theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
    toast.success(`Theme changed to ${nextTheme} mode`);
  };

  if (authLoading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Loader fullScreen />;
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { name: "Family Workspaces", href: "/dashboard/families", icon: <FolderHeart className="h-4.5 w-4.5" /> },
    { name: "Family Members", href: "/dashboard/family", icon: <Users className="h-4.5 w-4.5" /> },
    { name: "Family Vault", href: "/dashboard/vault", icon: <FolderLock className="h-4.5 w-4.5" /> },
    { name: "Document Intelligence", href: "/dashboard/intelligence", icon: <Sparkles className="h-4.5 w-4.5" /> },
    { name: "Readiness Audits", href: "/dashboard/audits", icon: <CalendarCheck2 className="h-4.5 w-4.5" /> },
    { name: "AI Chat Assistant", href: "/dashboard/chat", icon: <MessageSquareCode className="h-4.5 w-4.5" /> },
    { name: "Notifications", href: "/dashboard/alerts", icon: <BellRing className="h-4.5 w-4.5" /> },
    { name: "Settings", href: "/dashboard/settings", icon: <Settings2 className="h-4.5 w-4.5" /> },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const isDbConnected = health?.database === "connected";

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-45 flex w-64 flex-col bg-card border-r border-border/80 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <Logo showText={true} />
            {/* API Connection Health Badge */}
            <div
              className={`h-2.5 w-2.5 rounded-full border border-background shadow-sm ${
                isDbConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
              title={isDbConnected ? "Connected to Backend API" : "Backend Connection Issues"}
            />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-muted-foreground hover:text-foreground rounded-md outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Switcher Area */}
        <div className="px-4 pt-4 pb-2 border-b border-border/20 shrink-0">
          <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1.5 px-2 select-none">
            Active Vault Scope
          </div>
          <WorkspaceSwitcher />
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 outline-none focus:ring-1 focus:ring-ring ${
                  isActive
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-border/40 bg-zinc-950/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary border border-border">
              <UserIcon className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">
                {user?.fullName || "User Profile"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate select-all">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full flex items-center justify-start gap-2.5 h-9 text-xs text-danger hover:bg-danger/5 hover:text-danger border border-transparent hover:border-danger/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </Button>
          <div className="mt-3.5 text-[9px] text-muted-foreground/45 text-center select-none">
            © {new Date().getFullYear()} FamilyOS. All rights reserved.
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-border/40 bg-background/50 backdrop-blur-sm sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border/80 outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:block">
              <Breadcrumbs />
            </div>
          </div>

          {/* Search bar placeholder */}
          <div className="relative max-w-xs w-full mr-4 hidden sm:block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search vault..."
              onClick={() => toast.info("Search index builds automatically during file uploads")}
              className="w-full h-9 rounded-lg border border-border/80 bg-secondary/25 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
            />
          </div>

          <div className="flex items-center gap-3.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 outline-none"
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Notifications Dropdown bell */}
            <NotificationList />

            <div className="h-5.5 w-px bg-border/80" />

            {/* Profile widget */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20 shadow-sm select-none">
                {user?.fullName?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-xs font-bold text-foreground/80 hidden sm:inline select-none">
                {user?.fullName}
              </span>
            </div>
          </div>
        </header>

        {/* Content viewport */}
        <div className="flex-1 overflow-y-auto bg-zinc-950/20">
          {children}
        </div>
      </div>
    </div>
  );
}
