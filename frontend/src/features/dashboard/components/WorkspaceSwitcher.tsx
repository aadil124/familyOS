"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { ChevronDown, Plus, FolderHeart, Check, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  name: z
    .string()
    .min(1, { message: "Workspace name is required" })
    .max(50, { message: "Workspace name must be at most 50 characters" }),
});

type CreateWorkspaceInput = z.infer<typeof schema>;

export function WorkspaceSwitcher() {
  const { activeFamily, families, selectFamily, createNewFamily } = useWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelect = (family: typeof families[0]) => {
    selectFamily(family);
    setDropdownOpen(false);
  };

  const handleCreateSubmit = async (data: CreateWorkspaceInput) => {
    try {
      await createNewFamily(data.name);
      setModalOpen(false);
      reset();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Selector Button */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
      >
        <FolderHeart className="h-4.5 w-4.5 text-accent" />
        <span className="truncate max-w-[120px] sm:max-w-[200px]">
          {activeFamily ? activeFamily.name : "Select Workspace"}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground/60 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Switcher Dropdown */}
      {dropdownOpen && (
        <div className="absolute left-0 mt-2 z-40 w-64 rounded-xl border border-border bg-card p-1.5 shadow-soft glassmorphism animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider select-none">
            Workspaces
          </div>
          
          {/* Workspaces List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {families.map((family) => {
              const isSelected = activeFamily?.id === family.id;
              return (
                <button
                  key={family.id}
                  onClick={() => handleSelect(family)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors outline-none ${
                    isSelected
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <span className="truncate text-left">{family.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-accent shrink-0 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>

          <div className="my-1.5 border-t border-border/40" />

          {/* Create Button */}
          <button
            onClick={() => {
              setDropdownOpen(false);
              setModalOpen(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/5 rounded-lg transition-colors outline-none"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Create Workspace
          </button>
        </div>
      )}

      {/* Creation Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Family Workspace"
        description="Enter a custom name to label and segregate the metadata assets of this family unit."
      >
        <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-4 mt-2" noValidate>
          <Input
            label="Workspace Name"
            placeholder="e.g. Adil Family, Smith Vault"
            disabled={isSubmitting}
            error={errors.name?.message}
            icon={<Sparkles className="h-4 w-4 text-indigo-400" />}
            {...register("name")}
          />
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
              Create Workspace
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
