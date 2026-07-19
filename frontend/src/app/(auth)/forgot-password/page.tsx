import React from "react";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | FamilyOS",
  description: "Recover your FamilyOS password by entering your registered email address.",
  robots: "noindex, nofollow",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
