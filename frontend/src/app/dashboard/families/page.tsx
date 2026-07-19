"use client";

import React, { useState, useMemo } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { StatsCard } from "@/features/dashboard/components/StatsCard";
import { FamilyTable } from "@/features/dashboard/components/FamilyTable";
import { FamilyForm } from "@/features/dashboard/components/FamilyForm";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useFamiliesOverviewQuery,
  useCreateFamilyMutation,
  useUpdateFamilyMutation,
  useDeleteFamilyMutation,
  FamilyOverview,
} from "@/features/dashboard/services/queries";
import { FolderHeart, Plus, AlertTriangle, ShieldCheck, Heart } from "lucide-react";
import { toast } from "sonner";

export default function FamiliesListPage() {
  const { activeFamily } = useWorkspace();
  
  // 1. Fetch unified parallel overview metadata
  const { data: families = [], isLoading, refetch } = useFamiliesOverviewQuery();

  // Mutations
  const createMutation = useCreateFamilyMutation();
  const updateMutation = useUpdateFamilyMutation();
  const deleteMutation = useDeleteFamilyMutation();

  // State triggers
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FamilyOverview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyOverview | null>(null);

  // 2. Computed Overview metrics
  const metrics = useMemo(() => {
    const total = families.length;
    const highlyReady = families.filter((f) => f.readinessScore !== null && f.readinessScore >= 80).length;
    const unAudited = families.filter((f) => f.readinessScore === null).length;
    return { total, highlyReady, unAudited };
  }, [families]);

  // Handlers
  const handleCreateSubmit = async (data: { name: string }) => {
    try {
      await createMutation.mutateAsync({ name: data.name });
      setCreateOpen(false);
      toast.success(`Workspace "${data.name}" created successfully!`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to create family workspace.";
      toast.error(msg);
    }
  };

  const handleEditSubmit = async (data: { name: string }) => {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({
        familyId: editTarget.id,
        payload: { name: data.name },
      });
      setEditTarget(null);
      toast.success(`Workspace renamed to "${data.name}"`);
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to update workspace details.";
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      
      // If deleted workspace was the active scope, clear active state and let Provider fallback
      if (activeFamily?.id === deleteTarget.id) {
        localStorage.removeItem("familyos_active_family_id");
      }
      
      setDeleteTarget(null);
      toast.success("Workspace deleted successfully.");
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to delete workspace.";
      toast.error(msg);
    }
  };

  return (
    <PageContainer>
      {/* Header section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <span className="inline-flex items-center gap-1 w-max rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
            <Heart className="h-3 w-3" />
            Family Administration
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mt-1.5">
            Vault Workspaces
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Isolate and manage secure assets across multiple distinct family units.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2"
          size="sm"
        >
          <Plus className="h-4.5 w-4.5" />
          New Family Vault
        </Button>
      </div>

      {/* Overview Statistics Grid */}
      <div className="grid gap-6 sm:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
        <StatsCard
          title="Total Families"
          value={metrics.total}
          description="Total active workspaces registered under your ownership."
          isLoading={isLoading}
          icon={<FolderHeart className="h-4.5 w-4.5" />}
        />
        <StatsCard
          title="High Readiness"
          value={metrics.highlyReady}
          description="Workspaces showing compliance index scores &ge; 80%."
          isLoading={isLoading}
          icon={<ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />}
        />
        <StatsCard
          title="Pending Audits"
          value={metrics.unAudited}
          description="Vault workspaces currently lacking completed checklists."
          isLoading={isLoading}
          icon={<AlertTriangle className="h-4.5 w-4.5 text-amber-500" />}
        />
      </div>

      {/* Main Table view */}
      <Card className="animate-in fade-in slide-in-from-top-2 duration-300 delay-150">
        <CardHeader className="select-none">
          <CardTitle className="text-base font-bold">Workspace Register</CardTitle>
          <CardDescription>
            Sort, search, and manage permissions across all registered vaults. Click a row to open dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FamilyTable
            families={families}
            isLoading={isLoading}
            onEdit={(f) => setEditTarget(f)}
            onDelete={(f) => setDeleteTarget(f)}
          />
        </CardContent>
      </Card>

      {/* CREATE Modal */}
      <Dialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Workspace Vault"
        description="Provide a label to establish a secure database environment for a family unit."
      >
        <div className="mt-2">
          <FamilyForm
            onSubmit={handleCreateSubmit}
            isSubmitting={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </div>
      </Dialog>

      {/* EDIT Modal */}
      <Dialog
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Rename Workspace"
        description="Update the display name of this vault. All associated folders remain unaffected."
      >
        {editTarget && (
          <div className="mt-2">
            <FamilyForm
              initialValues={{ name: editTarget.name }}
              onSubmit={handleEditSubmit}
              isSubmitting={updateMutation.isPending}
              onCancel={() => setEditTarget(null)}
            />
          </div>
        )}
      </Dialog>

      {/* DELETE Confirmation Dialog */}
      <Dialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Family Workspace"
        className="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4 mt-2 select-none">
            <div className="flex gap-3.5 items-start p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] text-rose-500 text-sm">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold leading-normal">Irreversible action warning</h4>
                <p className="text-xs text-rose-500/80 leading-relaxed mt-1">
                  Deleting the workspace <strong>&quot;{deleteTarget.name}&quot;</strong> soft-deletes its members, vaults, checklist history, and configurations. You will lose access to all documents within this namespace.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to proceed? To complete deletion, click &quot;Confirm Delete&quot; below.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/20">
              <Button
                variant="outline"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteMutation.isPending}
                disabled={deleteMutation.isPending}
                onClick={handleDeleteConfirm}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </PageContainer>
  );
}
