import React from "react";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | FamilyOS",
  description: "Create an account on FamilyOS to secure your vault and audit your life events.",
  robots: "noindex, nofollow",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
