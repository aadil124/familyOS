"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { User, Camera, Trash2 } from "lucide-react";

// Form Schema Validation
const memberSchema = z.object({
  fullName: z
    .string()
    .min(1, { message: "Full name is required" })
    .max(100, { message: "Full name must be at most 100 characters" }),
  relationship: z
    .string()
    .min(1, { message: "Relationship tag is required" })
    .max(50, { message: "Relationship must be at most 50 characters" }),
  dateOfBirth: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d <= new Date();
      },
      { message: "Date of birth must be a valid date in the past" }
    ),
  primaryEmail: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return z.string().email().safeParse(val).success;
      },
      { message: "Primary email must be a valid email format" }
    ),
  primaryPhone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return val.length >= 7 && val.length <= 20;
      },
      { message: "Phone must be between 7 and 20 digits" }
    ),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  initialValues?: {
    fullName: string;
    relationship?: string | null;
    dateOfBirth?: string | Date | null;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
  };
  onSubmit: (data: {
    fullName: string;
    relationship: string;
    dateOfBirth: Date | null;
    primaryEmail: string | null;
    primaryPhone: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function MemberForm({ initialValues, onSubmit, isSubmitting = false, onCancel }: MemberFormProps) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert Date objects to YYYY-MM-DD strings for date input elements
  const formatInitialValues = useMemo(() => {
    if (!initialValues) return { fullName: "", relationship: "Other", dateOfBirth: "", primaryEmail: "", primaryPhone: "" };

    let dobString = "";
    if (initialValues.dateOfBirth) {
      const d = new Date(initialValues.dateOfBirth);
      if (!isNaN(d.getTime())) {
        dobString = d.toISOString().split("T")[0];
      }
    }

    return {
      fullName: initialValues.fullName,
      relationship: initialValues.relationship || "Other",
      dateOfBirth: dobString,
      primaryEmail: initialValues.primaryEmail || "",
      primaryPhone: initialValues.primaryPhone || "",
    };
  }, [initialValues]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: formatInitialValues,
  });

  // Reset form values if initialValues change
  useEffect(() => {
    reset(formatInitialValues);
    // Retrieve base64 avatar placeholder mock from sessionStorage if it exists
    const storedAvatar = sessionStorage.getItem(`familyos_avatar_mock_${initialValues?.fullName || ""}`);
    if (storedAvatar) {
      setAvatar(storedAvatar);
    } else {
      setAvatar(null);
    }
  }, [formatInitialValues, reset, initialValues]);

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

  // Avatar Upload Handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (<= 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size must be less than 2MB.");
      return;
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }

    // Simulate upload progress
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p === null) return null;
        if (p >= 100) {
          clearInterval(interval);
          
          // Encode to Base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setAvatar(base64);
            // Cache locally under member name for preview retention
            sessionStorage.setItem(`familyos_avatar_mock_${initialValues?.fullName || ""}`, base64);
            setUploadProgress(null);
            toast.warning(
              "Profile photo uploaded in-memory. Note: Avatars will not persist on page refreshes without backend database API integration."
            );
          };
          reader.readAsDataURL(file);
          
          return 100;
        }
        return p + 25;
      });
    }, 250);
  };

  const removeAvatar = () => {
    setAvatar(null);
    sessionStorage.removeItem(`familyos_avatar_mock_${initialValues?.fullName || ""}`);
    toast.info("Profile photo removed.");
  };

  const handleFormSubmit = async (data: MemberFormData) => {
    const formatted = {
      fullName: data.fullName,
      relationship: data.relationship,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      primaryEmail: data.primaryEmail || null,
      primaryPhone: data.primaryPhone || null,
    };
    await onSubmit(formatted);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      
      {/* Avatar Image Selection Primitives */}
      <div className="flex flex-col items-center gap-2 pb-2 select-none">
        <div className="relative group flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border border-border bg-secondary flex items-center justify-center overflow-hidden">
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted-foreground/60" />
            )}
          </div>
          
          {/* Progress bar overlay */}
          {uploadProgress !== null && (
            <div className="absolute inset-0 bg-background/80 rounded-full flex flex-col items-center justify-center p-2 z-10">
              <span className="text-[10px] font-bold text-foreground">{uploadProgress}%</span>
              <div className="w-12 h-1 bg-border rounded-full overflow-hidden mt-1">
                <div className="h-full bg-accent transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Camera trigger */}
          {uploadProgress === null && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-accent text-white border border-background shadow-sm hover:scale-105 active:scale-95 transition-all outline-none"
              title="Upload photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarChange}
          accept="image/*"
          className="hidden"
        />

        {avatar && uploadProgress === null && (
          <button
            type="button"
            onClick={removeAvatar}
            className="flex items-center gap-1 text-[10px] font-bold text-danger hover:underline"
          >
            <Trash2 className="h-3 w-3" />
            Remove Avatar
          </button>
        )}
      </div>

      <Input
        label="Full Name"
        placeholder="e.g. Jane Doe"
        disabled={isSubmitting}
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      {/* Relationship Selector */}
      <div className="flex flex-col gap-1 text-left">
        <label className="text-xs font-bold text-muted-foreground select-none">
          Relationship Tag
        </label>
        <select
          disabled={isSubmitting}
          className={`w-full h-10 rounded-lg border border-border bg-secondary/30 px-3 text-xs text-foreground outline-none transition-all focus:border-ring/30 focus:ring-1 focus:ring-ring/30 ${errors.relationship ? "border-danger" : ""}`}
          {...register("relationship")}
        >
          <option value="Spouse">Spouse</option>
          <option value="Child">Child</option>
          <option value="Sibling">Sibling</option>
          <option value="Grandparent">Grandparent</option>
          <option value="Guardian">Guardian</option>
          <option value="Other">Other</option>
        </select>
        {errors.relationship && (
          <span className="text-[10px] text-danger font-semibold mt-1">
            {errors.relationship.message}
          </span>
        )}
      </div>

      <Input
        label="Date of Birth"
        type="date"
        disabled={isSubmitting}
        error={errors.dateOfBirth?.message}
        {...register("dateOfBirth")}
      />

      <Input
        label="Primary Email"
        type="email"
        placeholder="e.g. jane@doe.com"
        disabled={isSubmitting}
        error={errors.primaryEmail?.message}
        {...register("primaryEmail")}
      />

      <Input
        label="Primary Phone"
        placeholder="e.g. +1 (555) 123-4567"
        disabled={isSubmitting}
        error={errors.primaryPhone?.message}
        {...register("primaryPhone")}
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
          Save Member
        </Button>
      </div>
    </form>
  );
}

// Quick useMemo import helper
import { useMemo } from "react";
