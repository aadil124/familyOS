"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { StatsCard } from "@/features/dashboard/components/StatsCard";
import { ActivityTimeline, ActivityItem } from "@/features/dashboard/components/ActivityTimeline";
import { RecentDocumentsTable } from "@/features/dashboard/components/RecentDocumentsTable";
import {
  useFamilyMemberQuery,
  useFamilyMembersQuery,
  useDocumentsQuery,
  useAssessmentsQuery,
  useNotificationsQuery,
} from "@/features/dashboard/services/queries";
import {
  getAvatarColor,
  getInitials,
} from "@/features/dashboard/components/MemberTable";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  User,
  Calendar,
  ChevronLeft,
  ShieldCheck,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  GitBranch,
  FileText,
  Bell,
} from "lucide-react";

interface PageProps {
  params: Promise<{ memberId: string }>;
}

export default function FamilyMemberDetailPage({ params }: PageProps) {
  const { memberId } = React.use(params);
  const router = useRouter();
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  // 1. Fetch scoped queries
  const { data: member, isLoading: memberLoading } = useFamilyMemberQuery(familyId, memberId);
  const { data: members = [], isLoading: membersLoading } = useFamilyMembersQuery(familyId);
  const { data: documents = [], isLoading: documentsLoading } = useDocumentsQuery(familyId);
  const { data: assessmentsResponse, isLoading: assessmentsLoading } = useAssessmentsQuery(familyId);
  const { data: notificationsResponse, isLoading: notificationsLoading } = useNotificationsQuery(familyId);

  const assessments = useMemo(() => assessmentsResponse?.data || [], [assessmentsResponse?.data]);
  const notifications = useMemo(() => notificationsResponse?.data || [], [notificationsResponse?.data]);

  const isDataLoading =
    memberLoading || membersLoading || documentsLoading || assessmentsLoading || notificationsLoading;

  // 2. Filter resources for this specific member
  const memberDocuments = useMemo(() => {
    return documents.filter((d) => d.familyMemberId === memberId);
  }, [documents, memberId]);

  const memberAssessments = useMemo(() => {
    return assessments.filter((a) => a.familyMemberId === memberId);
  }, [assessments, memberId]);

  const memberNotifications = useMemo(() => {
    return notifications.filter((n) => n.relatedFamilyMemberId === memberId && n.status === "unread");
  }, [notifications, memberId]);

  // 3. Compute statistics
  const stats = useMemo(() => {
    const docCount = memberDocuments.length;
    const scored = memberAssessments.filter(
      (a) => a.readinessScore !== undefined && a.readinessScore !== null
    );
    const avgReadiness =
      scored.length > 0
        ? Math.round(
            scored.reduce((acc, curr) => acc + (curr.readinessScore || 0), 0) / scored.length
          )
        : null;
    const alertCount = memberNotifications.length;

    return { docCount, avgReadiness, alertCount };
  }, [memberDocuments, memberAssessments, memberNotifications]);

  // 4. Profile Completion % Calculator
  const profileCompletion = useMemo(() => {
    if (!member) return 0;
    let score = 0;
    if (member.fullName) score += 20;
    if (member.relationship) score += 20;
    if (member.dateOfBirth) score += 20;
    if (member.primaryEmail) score += 20;
    if (member.primaryPhone) score += 20;
    return score;
  }, [member]);

  // 5. Scoped Timeline Activities
  const activityItems = useMemo(() => {
    const list: ActivityItem[] = [];

    memberDocuments.forEach((doc) => {
      list.push({
        id: `doc-${doc.id}`,
        type: "document",
        title: "File Registered",
        description: `"${doc.displayName}" registered under profile.`,
        timestamp: doc.createdAt,
      });
    });

    memberAssessments.forEach((ass) => {
      const eventName = ass.lifeEvent?.name || "Life Event";
      list.push({
        id: `ass-${ass.id}`,
        type: "assessment",
        title: "Checklist Assessment Run",
        description: `Readiness index score computed: ${ass.readinessScore}% for "${eventName}".`,
        timestamp: ass.createdAt,
      });
    });

    memberNotifications.forEach((n) => {
      list.push({
        id: `notif-${n.id}`,
        type: "alert",
        title: n.title,
        description: n.message,
        timestamp: n.createdAt,
      });
    });

    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [memberDocuments, memberAssessments, memberNotifications]);

  // 6. Upcoming Expirations
  const expiringDocuments = useMemo(() => {
    const now = new Date();
    return memberDocuments
      .filter((doc) => {
        if (!doc.expiresAt) return false;
        const expiryDate = new Date(doc.expiresAt);
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 90;
      })
      .sort((a, b) => {
        if (!a.expiresAt || !b.expiresAt) return 0;
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      })
      .slice(0, 2);
  }, [memberDocuments]);

  // 7. Scoped AI Recommendations
  const recommendation = useMemo(() => {
    const incomplete = memberAssessments.filter(
      (a) => a.missingDocuments && Array.isArray(a.missingDocuments) && a.missingDocuments.length > 0
    );

    if (incomplete.length > 0) {
      const topAudit = incomplete[0];
      const missingDocs = topAudit.missingDocuments as string[];
      const missingDoc = missingDocs[0];
      const eventName = topAudit.lifeEvent?.name || "Life Event";

      return {
        title: `Upload ${missingDoc}`,
        description: `Add missing ${missingDoc} to complete the "${eventName}" readiness audit.`,
        actionLabel: "Resolve Gap",
        actionHref: `/dashboard/vault?familyMemberId=${memberId}`,
      };
    }

    return {
      title: "Evaluate compliance status",
      description: "Trigger a readiness checklist audit to find compliance document gaps.",
      actionLabel: "Run Audit",
      actionHref: `/dashboard/audits?familyMemberId=${memberId}`,
    };
  }, [memberAssessments, memberId]);

  // 8. Visual Family Tree mapping
  const treeNodes = useMemo(() => {
    const spouse = members.find((m) => m.relationship === "Spouse");
    const childrenList = members.filter((m) => m.relationship === "Child");
    const siblingsList = members.filter((m) => m.relationship === "Sibling");

    return {
      spouse,
      childrenList,
      siblingsList,
    };
  }, [members]);

  const cachedAvatar = useMemo(() => {
    if (member?.fullName && typeof window !== "undefined") {
      return sessionStorage.getItem(`familyos_avatar_mock_${member.fullName}`);
    }
    return null;
  }, [member]);

  const avatarColor = useMemo(() => {
    return member ? getAvatarColor(member.fullName) : "transparent";
  }, [member]);

  return (
    <PageContainer>
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/family")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold mb-6 outline-none transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to registry
      </button>

      {/* Header section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white border border-border shadow-sm overflow-hidden select-none shrink-0"
            style={{
              backgroundColor: cachedAvatar ? undefined : avatarColor,
            }}
          >
            {cachedAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={cachedAvatar} alt="Profile" className="h-full w-full object-cover" />
            ) : member ? (
              getInitials(member.fullName)
            ) : (
              <User className="h-8 w-8 text-muted-foreground/60" />
            )}
          </div>

          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 w-max rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/25">
              {memberLoading ? "..." : member?.relationship || "Relative"}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mt-1.5">
              {memberLoading ? <Skeleton className="h-9 w-48" /> : member?.fullName}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              DOB: {member?.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "Not Provided"}
            </p>
          </div>
        </div>

        {/* Profile Completion Card */}
        <div className="flex items-center gap-3 bg-secondary/35 border border-border/80 rounded-xl px-4 py-2.5 sm:max-w-xs shrink-0 select-none">
          <div className="flex flex-col gap-0.5 min-w-[120px]">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Profile Completeness
            </span>
            <span className="text-sm font-extrabold text-foreground">{profileCompletion}%</span>
            <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
        <StatsCard
          title="Assigned Files"
          value={stats.docCount}
          description="Total documents in the vault assigned to this relative."
          isLoading={isDataLoading}
          icon={<FileText className="h-4.5 w-4.5" />}
        />
        <StatsCard
          title="Member Readiness"
          value={stats.avgReadiness !== null ? `${stats.avgReadiness}%` : "N/A"}
          description="Checklist audit compliance score calculated for this member."
          isLoading={isDataLoading}
          icon={<Award className="h-4.5 w-4.5" />}
          trend={
            stats.avgReadiness !== null
              ? {
                  value: stats.avgReadiness >= 80 ? "High" : stats.avgReadiness >= 50 ? "Moderate" : "Action Required",
                  type: stats.avgReadiness >= 80 ? "positive" : stats.avgReadiness >= 50 ? "neutral" : "negative",
                }
              : undefined
          }
        />
        <StatsCard
          title="Active Warnings"
          value={stats.alertCount}
          description="Unread notifications requiring name corrections or renewal."
          isLoading={isDataLoading}
          icon={<Bell className="h-4.5 w-4.5" />}
        />
      </div>

      {/* Grid Content */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300 delay-150">
        
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Documents Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 select-none">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold">Assigned Documents</CardTitle>
                <CardDescription>Files in the vault registered under this relative</CardDescription>
              </div>
              <a
                href={`/dashboard/vault?familyMemberId=${memberId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline outline-none"
              >
                Open Vault
                <ArrowRight className="h-3 w-3" />
              </a>
            </CardHeader>
            <CardContent>
              <RecentDocumentsTable
                documents={memberDocuments}
                members={members}
                isLoading={isDataLoading}
              />
            </CardContent>
          </Card>

          {/* Scoped Relationship Tree Mapping */}
          <Card>
            <CardHeader className="pb-3 select-none">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4.5 w-4.5 text-accent" />
                <CardTitle className="text-base font-bold">Relationship Mapping</CardTitle>
              </div>
              <CardDescription>Visual structural hierarchy tree linked to this workspace profile.</CardDescription>
            </CardHeader>
            <CardContent className="select-none overflow-x-auto min-h-[160px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-6 py-4 min-w-[400px]">
                
                {/* Level 1: Workspace Head / Spouses */}
                <div className="flex items-center gap-10 relative">
                  {/* Head */}
                  <div className="flex flex-col items-center p-3 rounded-xl border border-border bg-secondary/30 min-w-[120px]">
                    <span className="text-[9px] font-bold text-accent uppercase">Head</span>
                    <span className="text-xs font-bold text-foreground mt-0.5 truncate max-w-[100px]">
                      Owner
                    </span>
                  </div>

                  {/* Horizontal Link connector */}
                  {treeNodes.spouse && (
                    <div className="absolute left-[120px] right-[120px] top-[26px] h-px bg-border/80" />
                  )}

                  {/* Spouse */}
                  {treeNodes.spouse && (
                    <div className={`flex flex-col items-center p-3 rounded-xl border min-w-[120px] ${
                      member?.relationship === "Spouse"
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border bg-secondary/30"
                    }`}>
                      <span className="text-[9px] font-bold text-rose-400 uppercase">Spouse</span>
                      <span className="text-xs font-bold text-foreground mt-0.5 truncate max-w-[100px]">
                        {treeNodes.spouse.fullName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Vertical Line Connector */}
                {treeNodes.childrenList.length > 0 && (
                  <div className="h-6 w-px bg-border/80" />
                )}

                {/* Level 2: Children Grid */}
                {treeNodes.childrenList.length > 0 && (
                  <div className="flex items-center gap-6 flex-wrap justify-center">
                    {treeNodes.childrenList.map((child) => {
                      const isCurrent = child.id === memberId;
                      return (
                        <div
                          key={child.id}
                          className={`flex flex-col items-center p-3 rounded-xl border min-w-[120px] ${
                            isCurrent
                              ? "border-accent bg-accent/5 ring-1 ring-accent"
                              : "border-border bg-secondary/30"
                          }`}
                        >
                          <span className="text-[9px] font-bold text-sky-400 uppercase">Child</span>
                          <span className="text-xs font-bold text-foreground mt-0.5 truncate max-w-[100px]">
                            {child.fullName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          
          {/* AI Insights scoped */}
          <Card className="border-indigo-500/20 bg-indigo-500/[0.02] shadow-glow relative overflow-hidden select-none">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Sparkles className="h-4 w-4" />
                AI Recommendation
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDataLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3.5 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-foreground">{recommendation.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recommendation.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5 border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-400"
                    onClick={() => router.push(recommendation.actionHref)}
                  >
                    <span>{recommendation.actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Scoped Expirations */}
          <Card>
            <CardHeader className="pb-3 select-none">
              <CardTitle className="text-base font-bold">Upcoming Expirations</CardTitle>
              <CardDescription>Renewal notifications for this profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {isDataLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : expiringDocuments.length === 0 ? (
                <div className="flex gap-3 items-start p-3 border border-emerald-500/20 rounded-xl bg-emerald-500/[0.02] select-none text-emerald-500">
                  <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
                  <div>
                    <h5 className="text-xs font-bold leading-normal">Documents fully up to date</h5>
                    <p className="text-[10px] text-emerald-500/80 leading-relaxed mt-0.5">
                      No files are expired or expiring in the next 90 days.
                    </p>
                  </div>
                </div>
              ) : (
                expiringDocuments.map((doc) => {
                  const isExpired = new Date(doc.expiresAt!) < new Date();
                  return (
                    <div
                      key={doc.id}
                      className={`flex gap-3 items-start p-3 border rounded-xl animate-in fade-in duration-200 ${
                        isExpired
                          ? "bg-rose-500/[0.02] border-rose-500/20 text-rose-500"
                          : "bg-amber-500/[0.02] border-amber-500/20 text-amber-500"
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold leading-normal truncate text-foreground">
                          {doc.displayName}
                        </h5>
                        <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                          Expires: {new Date(doc.expiresAt!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Scoped Activity Log */}
          <Card>
            <CardHeader className="pb-3 select-none">
              <CardTitle className="text-base font-bold">Activity Log</CardTitle>
              <CardDescription>Recent events linked to this relative</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTimeline items={activityItems} isLoading={isDataLoading} />
            </CardContent>
          </Card>

        </div>
      </div>
    </PageContainer>
  );
}
