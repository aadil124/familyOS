"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatsCard } from "@/features/dashboard/components/StatsCard";
import { QuickActionCard } from "@/features/dashboard/components/QuickActionCard";
import { ActivityTimeline, ActivityItem } from "@/features/dashboard/components/ActivityTimeline";
import { RecentDocumentsTable } from "@/features/dashboard/components/RecentDocumentsTable";
import {
  useFamilyQuery,
  useFamilyMembersQuery,
  useDocumentsQuery,
  useAssessmentsQuery,
  useNotificationsQuery,
} from "@/features/dashboard/services/queries";
import {
  Sparkles,
  FileText,
  Award,
  Bell,
  Users,
  Plus,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Calendar,
  MessageSquareCode,
} from "lucide-react";

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export default function FamilyDetailPage({ params }: PageProps) {
  const { familyId } = React.use(params);
  const router = useRouter();

  // 1. Fetch detailed queries for the target workspace
  const { data: family, isLoading: familyLoading } = useFamilyQuery(familyId);
  const { data: members = [], isLoading: membersLoading } = useFamilyMembersQuery(familyId);
  const { data: documents = [], isLoading: documentsLoading } = useDocumentsQuery(familyId);
  const { data: assessmentsResponse, isLoading: assessmentsLoading } = useAssessmentsQuery(familyId);
  const { data: notificationsResponse, isLoading: notificationsLoading } = useNotificationsQuery(familyId);

  const assessments = useMemo(() => assessmentsResponse?.data || [], [assessmentsResponse?.data]);
  const notifications = useMemo(() => notificationsResponse?.data || [], [notificationsResponse?.data]);

  const isDataLoading =
    familyLoading || membersLoading || documentsLoading || assessmentsLoading || notificationsLoading;

  // 2. Computed statistics
  const stats = useMemo(() => {
    const docCount = documents.length;
    const scoredAssessments = assessments.filter(
      (a) => a.readinessScore !== undefined && a.readinessScore !== null
    );
    const avgReadiness =
      scoredAssessments.length > 0
        ? Math.round(
            scoredAssessments.reduce((acc, curr) => acc + (curr.readinessScore || 0), 0) /
              scoredAssessments.length
          )
        : null;
    const unreadAlerts = notifications.filter((n) => n.status === "unread").length;

    return { docCount, avgReadiness, unreadAlerts };
  }, [documents, assessments, notifications]);

  // 3. Compile timeline activities
  const activityItems = useMemo(() => {
    const list: ActivityItem[] = [];

    documents.forEach((doc) => {
      list.push({
        id: `doc-${doc.id}`,
        type: "document",
        title: "Document Registered",
        description: `"${doc.displayName}" registered in vault.`,
        timestamp: doc.createdAt,
      });
    });

    assessments.forEach((ass) => {
      const eventName = ass.lifeEvent?.name || "Life Event";
      list.push({
        id: `ass-${ass.id}`,
        type: "assessment",
        title: "Readiness Audit Completed",
        description: `Calculated readiness score of ${ass.readinessScore}% for "${eventName}".`,
        timestamp: ass.createdAt,
      });
    });

    notifications.forEach((n) => {
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
  }, [documents, assessments, notifications]);

  // 4. Identify expiring documents
  const expiringDocuments = useMemo(() => {
    const now = new Date();
    return documents
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
      .slice(0, 3);
  }, [documents]);

  // 5. AI Recommendations
  const recommendation = useMemo(() => {
    const incompleteAssessments = assessments.filter(
      (a) => a.missingDocuments && Array.isArray(a.missingDocuments) && a.missingDocuments.length > 0
    );

    if (incompleteAssessments.length > 0) {
      const topAudit = incompleteAssessments[0];
      const member = members.find((m) => m.id === topAudit.familyMemberId);
      const memberName = member ? member.fullName : "Workspace Owner";
      const missingDocs = topAudit.missingDocuments as string[];
      const missingDoc = missingDocs[0];
      const eventName = topAudit.lifeEvent?.name || "Life Event";

      return {
        title: `Upload ${missingDoc}`,
        description: `Add the missing ${missingDoc} for ${memberName} to complete the "${eventName}" readiness audit.`,
        actionLabel: "Resolve Gaps",
        actionHref: `/dashboard/vault?familyId=${familyId}`,
      };
    }

    return {
      title: "Run a readiness audit",
      description: "Select a life event to audit file compliance and discover gaps.",
      actionLabel: "Start Audit",
      actionHref: `/dashboard/audits?familyId=${familyId}`,
    };
  }, [assessments, members, familyId]);

  return (
    <PageContainer>
      {/* Return link */}
      <button
        onClick={() => router.push("/dashboard/families")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold mb-6 outline-none transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to families
      </button>

      {/* Header section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <span className="inline-flex items-center gap-1 w-max rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
            <FolderOpen className="h-3 w-3" />
            Administrative Overview
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mt-1.5">
            {familyLoading ? <Skeleton className="h-9 w-48" /> : family?.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Registered: {family?.createdAt ? new Date(family.createdAt).toLocaleDateString() : "—"}
          </p>
        </div>

        {/* Member profile widget summary */}
        <div className="flex items-center gap-3 bg-secondary/35 border border-border/80 rounded-xl px-4 py-2.5 sm:max-w-xs shrink-0 select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">Workspace Scope</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{members.length} Members, {documents.length} Files</p>
          </div>
        </div>
      </div>

      {/* Overview Statistics Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
        <StatsCard
          title="Vault Files"
          value={stats.docCount}
          description="Legal and financial documents uploaded to this workspace."
          isLoading={isDataLoading}
          icon={<FileText className="h-4.5 w-4.5" />}
        />
        <StatsCard
          title="Readiness Index"
          value={stats.avgReadiness !== null ? `${stats.avgReadiness}%` : "N/A"}
          description="Average readiness score calculated across this vault."
          isLoading={isDataLoading}
          icon={<Award className="h-4.5 w-4.5" />}
          trend={
            stats.avgReadiness !== null
              ? {
                  value: stats.avgReadiness >= 80 ? "Excellent" : stats.avgReadiness >= 50 ? "Moderate" : "Needs Review",
                  type: stats.avgReadiness >= 80 ? "positive" : stats.avgReadiness >= 50 ? "neutral" : "negative",
                }
              : undefined
          }
        />
        <StatsCard
          title="Active Alerts"
          value={stats.unreadAlerts}
          description="Unread notifications specifically matching this family."
          isLoading={isDataLoading}
          icon={<Bell className="h-4.5 w-4.5" />}
        />
      </div>

      {/* Grid: Main Page Widgets */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300 delay-150">
        
        {/* Left Side: Recent Documents */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 select-none">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold">Vault Documents Overview</CardTitle>
                <CardDescription>Documents registered within this namespace</CardDescription>
              </div>
              <a
                href={`/dashboard/vault?familyId=${familyId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline outline-none"
              >
                Go to Vault
                <ArrowRight className="h-3 w-3" />
              </a>
            </CardHeader>
            <CardContent>
              <RecentDocumentsTable
                documents={documents.slice(0, 5)}
                members={members}
                isLoading={isDataLoading}
              />
            </CardContent>
          </Card>

          {/* Quick Actions Panel */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1 select-none">
              Scoped Quick Actions
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <QuickActionCard
                title="Upload Document"
                description="Securely upload passports, certificates, or contracts to this specific vault."
                href={`/dashboard/vault?familyId=${familyId}`}
                icon={<Plus className="h-5 w-5" />}
              />
              <QuickActionCard
                title="Trigger Audit Check"
                description="Evaluate document readiness compliance checklist for this family."
                href={`/dashboard/audits?familyId=${familyId}`}
                icon={<Award className="h-5 w-5" />}
              />
              <QuickActionCard
                title="Edit Family Profiles"
                description="Add or edit family members belonging to this specific workspace."
                href={`/dashboard/family?familyId=${familyId}`}
                icon={<Users className="h-5 w-5" />}
              />
              <QuickActionCard
                title="Consult Chat AI"
                description="Ask AI assistant about missing documents or renewing files in this workspace."
                href={`/dashboard/chat?familyId=${familyId}`}
                icon={<MessageSquareCode className="h-5 w-5" />}
                badge="AI"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Activity Timeline & Alerts */}
        <div className="space-y-6">
          
          {/* AI Insights Recommendations */}
          <Card className="border-indigo-500/20 bg-indigo-500/[0.02] shadow-glow relative overflow-hidden select-none">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Sparkles className="h-4 w-4" />
                Workspace AI Insights
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

          {/* Expirations Card */}
          <Card>
            <CardHeader className="pb-3 select-none">
              <CardTitle className="text-base font-bold">Upcoming Expirations</CardTitle>
              <CardDescription>Critical files requiring renewal attention</CardDescription>
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
                    <h5 className="text-xs font-bold leading-normal">Vault fully up-to-date</h5>
                    <p className="text-[10px] text-emerald-500/80 leading-relaxed mt-0.5">
                      No documents are expired or expiring in the next 90 days.
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

          {/* Activity Timeline Card */}
          <Card>
            <CardHeader className="pb-3 select-none">
              <CardTitle className="text-base font-bold">Activity Log</CardTitle>
              <CardDescription>Recent events in this family scope</CardDescription>
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
