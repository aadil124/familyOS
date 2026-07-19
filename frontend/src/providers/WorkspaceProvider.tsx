"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useFamiliesQuery, useCreateFamilyMutation } from "@/features/dashboard/services/queries";
import { FamilyResponseDto } from "@/features/dashboard/services/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { ShieldAlert } from "lucide-react";

interface WorkspaceContextType {
  activeFamily: FamilyResponseDto | null;
  families: FamilyResponseDto[];
  isLoading: boolean;
  selectFamily: (family: FamilyResponseDto) => void;
  createNewFamily: (name: string) => Promise<FamilyResponseDto>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Workspace name is required" })
    .max(50, { message: "Workspace name must be at most 50 characters" }),
});

type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data: families = [], isLoading: isFetchingFamilies } = useFamiliesQuery({ enabled: isAuthenticated });
  const createFamilyMutation = useCreateFamilyMutation();
  const [activeFamily, setActiveFamily] = useState<FamilyResponseDto | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceDto>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: "" },
  });

  // 1. Restore/Select active family workspace
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveFamily(null);
      setShowSetupModal(false);
      return;
    }

    if (isFetchingFamilies) return;

    if (families.length === 0) {
      setActiveFamily(null);
      setShowSetupModal(true); // User has no families, force initialization dialog
      return;
    }

    setShowSetupModal(false);

    // Try restoring from localStorage
    const savedId = localStorage.getItem("familyos_active_family_id");
    const restored = families.find((f) => f.id === savedId);

    if (restored) {
      setActiveFamily(restored);
    } else {
      // Default to the first family workspace
      setActiveFamily(families[0]);
      localStorage.setItem("familyos_active_family_id", families[0].id);
    }
  }, [families, isFetchingFamilies, isAuthenticated]);

  // 2. Select Workspace Handler
  const selectFamily = (family: FamilyResponseDto) => {
    setActiveFamily(family);
    localStorage.setItem("familyos_active_family_id", family.id);
    toast.success(`Switched to workspace: ${family.name}`);
  };

  // 3. Create Workspace Mutation Handler
  const createNewFamily = async (name: string): Promise<FamilyResponseDto> => {
    try {
      const newFamily = await createFamilyMutation.mutateAsync({ name });
      setActiveFamily(newFamily);
      localStorage.setItem("familyos_active_family_id", newFamily.id);
      setShowSetupModal(false);
      reset();
      toast.success(`Workspace "${name}" successfully created!`);
      return newFamily;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errMsg = err.response?.data?.message || "Failed to create workspace.";
      toast.error(errMsg);
      throw error;
    }
  };

  const onSubmitSetup = async (data: CreateWorkspaceDto) => {
    await createNewFamily(data.name);
  };

  const isLoading = isFetchingFamilies || activeFamily === null && families.length > 0;

  return (
    <WorkspaceContext.Provider
      value={{
        activeFamily,
        families,
        isLoading,
        selectFamily,
        createNewFamily,
      }}
    >
      {/* Loading Splash screen */}
      {isLoading && <Loader fullScreen />}

      {/* Main Content viewport */}
      {!isLoading && children}

      {/* Non-dismissible Workspace Initialization Dialog */}
      <Dialog
        isOpen={showSetupModal}
        onClose={() => {
          // Prevent closing by clicking outside/escape key
          if (families.length > 0) setShowSetupModal(false);
        }}
        title="Create Family Workspace"
        description="Every account requires a family workspace to manage documents and readiness audits. Get started by naming your family workspace below."
        className="max-w-md [&>button]:hidden" // Hide close button
      >
        <form onSubmit={handleSubmit(onSubmitSetup)} className="space-y-4 mt-2" noValidate>
          <Input
            label="Workspace Name"
            placeholder="e.g. Adil Family, Smith Vault"
            disabled={isSubmitting}
            error={errors.name?.message}
            icon={<ShieldAlert className="h-4 w-4 text-indigo-400" />}
            {...register("name")}
          />
          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Create & Continue
          </Button>
        </form>
      </Dialog>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
