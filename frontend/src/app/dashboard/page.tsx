"use client";

import React from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Sparkles, Calendar, KeyRound, Clock, Shield } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <PageContainer>
      {/* Header section */}
      <div className="mb-8 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
        <span className="inline-flex items-center gap-1 w-max rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
          <Sparkles className="h-3 w-3" />
          Active Workspace
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Welcome back, {user?.fullName || "User"}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is your FamilyOS security vault overview and active authentication session parameters.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
        <Card className="hover:border-accent/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Encryption Status
              </CardTitle>
              <h4 className="text-2xl font-bold text-foreground">Protected</h4>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <Shield className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              Metadata vault encrypted using TLS 1.3. Secure refresh tokens are parsed and rotated automatically.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Registration Date
              </CardTitle>
              <h4 className="text-2xl font-bold text-foreground">
                {user && "createdAt" in user && user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Active Now"}
              </h4>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Calendar className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              User profile registered and verified on the NestJS Postgres storage tier.
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1 hover:border-accent/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Last Login
              </CardTitle>
              <h4 className="text-2xl font-bold text-foreground">
                {user && "lastLoginAt" in user && user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Just now"}
              </h4>
            </div>
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              Timestamp record updated in the database on successful authentication handshake.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Section */}
      <div className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-300 delay-150">
        {/* Session details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Authentication Session Parameters</CardTitle>
            <CardDescription>
              Technical details about the current JWT and state session context
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/40 gap-1">
                <span className="font-semibold text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-foreground bg-secondary px-2 py-0.5 rounded break-all select-all sm:max-w-[400px]">
                  {user?.id}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/40 gap-1">
                <span className="font-semibold text-muted-foreground">Display Name</span>
                <span className="text-foreground">{user?.fullName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/40 gap-1">
                <span className="font-semibold text-muted-foreground">Email Address</span>
                <span className="text-foreground">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/40 gap-1">
                <span className="font-semibold text-muted-foreground">Session Expiry</span>
                <span className="text-foreground flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  15 Minutes (Access Token)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-accent" />
              Auth Scope
            </CardTitle>
            <CardDescription>
              Completed modules in this development segment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                Next.js 15 App Routing
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                Axios interceptors & refresh retry
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                Zod validation resolvers
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                Tailwind CSS variables theme tokens
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80 text-muted-foreground/60">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                <span className="line-through">Documents Vault Module (Next Step)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
