import React from "react";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Password | FamilyOS",
  description: "Set a new password for your FamilyOS workspace.",
  robots: "noindex, nofollow",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
