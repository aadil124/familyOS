"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Mail, User } from "lucide-react";
import Link from "next/link";

// Password constraints matching backend exactly
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, { message: "First name is required" })
      .max(50, { message: "First name must be at most 50 characters" }),
    lastName: z
      .string()
      .min(1, { message: "Last name is required" })
      .max(50, { message: "Last name must be at most 50 characters" }),
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Must be a valid email address" })
      .max(100, { message: "Email must be at most 100 characters" }),
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

export type RegisterDto = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register: signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterDto) => {
    setIsSubmitting(true);
    try {
      await signUp({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      // Errors are handled by toast in AuthContext
      console.error("Register submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full" glass={false}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center sm:text-left">
          Create an account
        </CardTitle>
        <CardDescription className="text-center sm:text-left">
          Get started with FamilyOS by entering your details below
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              id="firstName"
              placeholder="John"
              disabled={isSubmitting}
              error={errors.firstName?.message}
              icon={<User className="h-4 w-4" />}
              {...register("firstName")}
            />
            <Input
              label="Last Name"
              type="text"
              id="lastName"
              placeholder="Doe"
              disabled={isSubmitting}
              error={errors.lastName?.message}
              icon={<User className="h-4 w-4" />}
              {...register("lastName")}
            />
          </div>

          {/* Email address */}
          <Input
            label="Email Address"
            type="email"
            id="email"
            placeholder="john.doe@example.com"
            disabled={isSubmitting}
            error={errors.email?.message}
            icon={<Mail className="h-4 w-4" />}
            {...register("email")}
          />

          {/* Password */}
          <PasswordInput
            label="Password"
            id="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            error={errors.password?.message}
            helperText="At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char"
            {...register("password")}
          />

          {/* Confirm Password */}
          <PasswordInput
            label="Confirm Password"
            id="confirmPassword"
            placeholder="••••••••"
            disabled={isSubmitting}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full mt-4"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Account
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="ml-1 font-semibold text-accent hover:underline outline-none"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
