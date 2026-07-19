"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
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
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // While checking auth status, show full screen loader
  if (isLoading) {
    return <Loader fullScreen />;
  }

  // Hide dashboard contents if unauthenticated and redirecting
  if (!isAuthenticated) {
    return <Loader fullScreen />;
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { name: "Family Members", href: "/dashboard/family", icon: <Users className="h-4.5 w-4.5" /> },
    { name: "Family Vault", href: "/dashboard/vault", icon: <FolderLock className="h-4.5 w-4.5" /> },
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

  return (
    <div className="min-h-screen bg-background text-foreground flex">
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
          <Logo showText={true} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-muted-foreground hover:text-foreground rounded-md outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => (
            <a
              key={item.name}
              href="#"
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                item.name === "Dashboard"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.name}
            </a>
          ))}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-border/40 bg-zinc-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary border border-border">
              <UserIcon className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.fullName || "User Profile"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
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
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-border/40 bg-background/50 backdrop-blur-sm sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border/80 outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold tracking-tight text-foreground select-none hidden md:block">
              Workspace / {user?.fullName || "Family Workspace"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
              {user?.fullName?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-xs font-semibold text-foreground/80 hidden sm:inline select-none">
              {user?.fullName}
            </span>
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
