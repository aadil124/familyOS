"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Mail } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Must be a valid email address" }),
  password: z
    .string()
    .min(1, { message: "Password is required" }),
  rememberMe: z.boolean(),
});

export type LoginDto = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginDto) => {
    setIsSubmitting(true);
    try {
      await login(
        { email: data.email, password: data.password },
        data.rememberMe
      );
    } catch (error) {
      // Errors are handled by the toast in AuthContext
      console.error("Login submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full" glass={false}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center sm:text-left">
          Welcome back
        </CardTitle>
        <CardDescription className="text-center sm:text-left">
          Enter your email to sign in to your FamilyOS workspace
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email field */}
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

          {/* Password field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground select-none" />
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-accent hover:underline outline-none"
              >
                Forgot your password?
              </Link>
            </div>
            <PasswordInput
              label="Password"
              id="password"
              placeholder="••••••••"
              disabled={isSubmitting}
              error={errors.password?.message}
              {...register("password")}
            />
          </div>

          {/* Remember Me checkbox */}
          <div className="pt-1 flex items-center justify-between">
            <Checkbox
              label="Remember me on this device"
              id="rememberMe"
              disabled={isSubmitting}
              {...register("rememberMe")}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full mt-4"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Sign In
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="ml-1 font-semibold text-accent hover:underline outline-none"
        >
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
