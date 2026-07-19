"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ShieldAlert } from "lucide-react";

const familySchema = z.object({
  name: z
    .string()
    .min(1, { message: "Workspace name is required" })
    .max(100, { message: "Workspace name must be at most 100 characters" }),
});

type FamilyFormData = z.infer<typeof familySchema>;

interface FamilyFormProps {
  initialValues?: { name: string };
  onSubmit: (data: FamilyFormData) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function FamilyForm({ initialValues, onSubmit, isSubmitting = false, onCancel }: FamilyFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: initialValues || { name: "" },
  });

  // Reset form values if initialValues change (e.g. loading async edit values)
  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  // Prevent accidental page close/refresh when editing unsaved data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDirty) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to discard them?"
      );
      if (!confirmClose) return;
    }
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        label="Workspace Name"
        placeholder="e.g. Smith Vault, Johnson Records"
        disabled={isSubmitting}
        error={errors.name?.message}
        icon={<ShieldAlert className="h-4 w-4 text-indigo-400" />}
        {...register("name")}
      />

      <div className="flex justify-end gap-2.5 pt-3 border-t border-border/30">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={handleCancelClick}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
          Save Workspace
        </Button>
      </div>
    </form>
  );
}
