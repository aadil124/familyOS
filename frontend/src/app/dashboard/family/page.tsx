"use client";

import React, { useState, useMemo } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { StatsCard } from "@/features/dashboard/components/StatsCard";
import { MemberTable, calculateAge } from "@/features/dashboard/components/MemberTable";
import { MemberForm } from "@/features/dashboard/components/MemberForm";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useFamilyMembersQuery,
  useCreateFamilyMemberMutation,
  useUpdateFamilyMemberMutation,
  useDeleteFamilyMemberMutation,
} from "@/features/dashboard/services/queries";
import { FamilyMemberResponseDto } from "@/features/dashboard/services/types";
import { Users, UserPlus, Send, AlertTriangle, ShieldCheck, Heart } from "lucide-react";
import { toast } from "sonner";

const inviteSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" }),
});

type InviteInput = z.infer<typeof inviteSchema>;

export default function FamilyMembersPage() {
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  // 1. Fetch member profiles
  const { data: members = [], isLoading, refetch } = useFamilyMembersQuery(familyId);

  // Mutations
  const createMutation = useCreateFamilyMemberMutation(familyId);
  const updateMutation = useUpdateFamilyMemberMutation(familyId);
  const deleteMutation = useDeleteFamilyMemberMutation(familyId);

  // Dialog State triggers
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FamilyMemberResponseDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMemberResponseDto | null>(null);

  // Invitation Form
  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    reset: resetInvite,
    formState: { errors: inviteErrors, isSubmitting: inviteSubmitting },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });

  // 2. Computed Statistics
  const stats = useMemo(() => {
    const total = members.length;
    const minors = members.filter((m) => {
      const age = calculateAge(m.dateOfBirth);
      return age !== null && age < 18;
    }).length;
    const adults = total - minors;
    return { total, minors, adults };
  }, [members]);

  // Handlers
  const handleAddSubmit = async (data: {
    fullName: string;
    relationship?: string;
    dateOfBirth?: Date | null;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
  }) => {
    try {
      await createMutation.mutateAsync(data);
      setAddOpen(false);
      toast.success(`Profile for "${data.fullName}" added successfully!`);
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to add family member.";
      toast.error(msg);
    }
  };

  const handleEditSubmit = async (data: {
    fullName?: string;
    relationship?: string;
    dateOfBirth?: Date | null;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
  }) => {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({
        memberId: editTarget.id,
        payload: data,
      });
      setEditTarget(null);
      toast.success(`Profile for "${data.fullName}" updated.`);
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to update profile details.";
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Family member profile deleted successfully.");
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to delete profile.";
      toast.error(msg);
    }
  };

  const onInviteSubmit = async (data: InviteInput) => {
    // Simulate sending email invitation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.warning(`Invitation simulated for: ${data.email}. Note: invitations will not link accounts without backend invite email integrations.`);
    setInviteOpen(false);
    resetInvite();
  };

  return (
    <PageContainer>
      {/* Header section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <span className="inline-flex items-center gap-1 w-max rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
            <Heart className="h-3 w-3" />
            Workspace Registry
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mt-1.5">
            Family Members
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Maintain personal details, contact fields, and vault authorizations for relatives.
          </p>
        </div>

        <div className="flex gap-2.5">
          <Button
            onClick={() => setInviteOpen(true)}
            variant="outline"
            className="flex items-center gap-2 border-border/80 text-muted-foreground hover:text-foreground h-9 text-xs"
          >
            <Send className="h-4 w-4 shrink-0" />
            Invite relative
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 h-9 text-xs"
          >
            <UserPlus className="h-4.5 w-4.5 shrink-0" />
            Add relative
          </Button>
        </div>
      </div>

      {/* Grid: Statistics */}
      <div className="grid gap-6 sm:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
        <StatsCard
          title="Total relatives"
          value={stats.total}
          description="Members registered within this active family workspace."
          isLoading={isLoading}
          icon={<Users className="h-4.5 w-4.5" />}
        />
        <StatsCard
          title="Adult Members"
          value={stats.adults}
          description="Members calculated to be aged 18 years or older."
          isLoading={isLoading}
          icon={<ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />}
        />
        <StatsCard
          title="Minor Members"
          value={stats.minors}
          description="Members calculated to be aged under 18 years."
          isLoading={isLoading}
          icon={<AlertTriangle className="h-4.5 w-4.5 text-indigo-400" />}
        />
      </div>

      {/* Members Registry Table Card */}
      <Card className="animate-in fade-in slide-in-from-top-2 duration-300 delay-150">
        <CardHeader className="select-none">
          <CardTitle className="text-base font-bold">Relative Profiles</CardTitle>
          <CardDescription>
            Sort, search, and manage vaults for active members. Click a row to view specific details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberTable
            members={members}
            isLoading={isLoading}
            onEdit={(m) => setEditTarget(m)}
            onDelete={(m) => setDeleteTarget(m)}
          />
        </CardContent>
      </Card>

      {/* ADD Modal */}
      <Dialog
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Family Member"
        description="Provide personal details to register a new member profile to this active workspace."
      >
        <div className="mt-2">
          <MemberForm
            onSubmit={handleAddSubmit}
            isSubmitting={createMutation.isPending}
            onCancel={() => setAddOpen(false)}
          />
        </div>
      </Dialog>

      {/* EDIT Modal */}
      <Dialog
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit Member Profile"
        description="Update contact and personal fields of the selected family member."
      >
        {editTarget && (
          <div className="mt-2">
            <MemberForm
              initialValues={editTarget}
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
        title="Delete Family Member"
        className="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4 mt-2 select-none">
            <div className="flex gap-3.5 items-start p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] text-rose-500 text-sm">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold leading-normal">Irreversible action warning</h4>
                <p className="text-xs text-rose-500/80 leading-relaxed mt-1">
                  Deleting the profile <strong>&quot;{deleteTarget.fullName}&quot;</strong> soft-deletes their audit history, assigned compliance checklist metrics, and vault configurations. You will lose access to their associated documents.
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

      {/* INVITE Dialog Modal */}
      <Dialog
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Family Relative"
        description="Send a secure link asking a relative to bind their user account and access this family vault workspace."
      >
        <form onSubmit={handleInviteSubmit(onInviteSubmit)} className="space-y-4 mt-2" noValidate>
          <Input
            label="Email Address"
            placeholder="e.g. relative@vault.com"
            disabled={inviteSubmitting}
            error={inviteErrors.email?.message}
            icon={<Send className="h-4 w-4 text-indigo-400" />}
            {...registerInvite("email")}
          />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-border/30">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={inviteSubmitting}
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={inviteSubmitting} disabled={inviteSubmitting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Dialog>
    </PageContainer>
  );
}
