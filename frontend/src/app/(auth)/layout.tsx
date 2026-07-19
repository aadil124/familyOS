"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { Loader } from "@/components/ui/Loader";

export default function PublicAuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // While restoring auth state, show a loading splash screen
  if (isLoading) {
    return <Loader fullScreen />;
  }

  // If logged in, hide children during redirect transition to prevent layout flashing
  if (isAuthenticated) {
    return <Loader fullScreen />;
  }

  return <AuthLayout>{children}</AuthLayout>;
}
