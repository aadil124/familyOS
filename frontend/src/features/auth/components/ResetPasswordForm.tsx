"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { ArrowLeft, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";

// Password constraints matching backend exactly
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(100, { message: "Password must be at most 100 characters" })
      .regex(passwordRegex, {
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      }),
    confirmPassword: z.string().min(1, { message: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordDto>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordDto) => {
    setIsSubmitting(true);
    // Simulate API call since backend lacks reset-password endpoint
    try {
      console.warn("Reset Password request submitted (mock). Data length checked.", !!data.password);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSuccess(true);
      toast.success("Password reset simulated successfully!");
    } catch (err) {
      console.error("Reset password error simulated:", err);
      toast.error("Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Password Updated</CardTitle>
          <CardDescription className="mt-2">
            Your simulated password reset has completed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-zinc-900/50 p-4 border border-border/60 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Backend Mismatch Notice:</span> This features uses a simulated workflow because the backend lacks a reset-password API.
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline outline-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to login
          </a>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center sm:text-left">
          Choose a new password
        </CardTitle>
        <CardDescription className="text-center sm:text-left">
          Enter your new password below. Make sure it contains uppercase, lowercase, numbers, and symbols.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <PasswordInput
            label="New Password"
            id="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            error={errors.password?.message}
            {...register("password")}
          />

          <PasswordInput
            label="Confirm New Password"
            id="confirmPassword"
            placeholder="••••••••"
            disabled={isSubmitting}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Reset Password
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <a
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline outline-none"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </a>
      </CardFooter>
    </Card>
  );
}
