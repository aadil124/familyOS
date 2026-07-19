import React from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | FamilyOS",
  description: "Sign in to your FamilyOS workspace to manage your family documents and readiness audits.",
  robots: "noindex, nofollow",
};

export default function LoginPage() {
  return <LoginForm />;
}
