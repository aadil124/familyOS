"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Mail, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Must be a valid email address" }),
});

type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordDto>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordDto) => {
    setIsSubmitting(true);
    // Simulate API call since backend lacks forgot-password endpoint
    try {
      console.warn("Forgot Password request submitted for:", data.email, "- Note: Backend endpoint is pending implementation.");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSuccess(true);
      toast.success("Reset link request simulated successfully!");
    } catch (err) {
      console.error("Forgot password request failure:", err);
      toast.error("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Check your email</CardTitle>
          <CardDescription className="mt-2">
            If an account exists for that email address, we have sent a simulated password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-zinc-900/50 p-4 border border-border/60 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Backend Mismatch Notice:</span> This features uses a simulated workflow because the backend lacks a mail/forgot-password API. Check developer console for logged values.
            </div>
          </div>
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

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center sm:text-left">
          Reset password
        </CardTitle>
        <CardDescription className="text-center sm:text-left">
          Enter your email address and we&apos;ll send you a link to reset your password
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email Address"
            type="email"
            id="email"
            placeholder="name@example.com"
            disabled={isSubmitting}
            error={errors.email?.message}
            icon={<Mail className="h-4 w-4" />}
            {...register("email")}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Send Reset Link
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
