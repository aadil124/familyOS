"use client";

import React, { useState, useMemo } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useAssessmentsQuery,
  useLifeEventsQuery,
  useFamilyMembersQuery,
  useCreateAssessmentMutation,
  useDocumentsQuery,
} from "@/features/dashboard/services/queries";
import { ReadinessAssessmentResponseDto, LifeEventResponseDto } from "@/features/dashboard/services/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  History,
  FileCheck,
  ChevronRight,
  TrendingUp,
  Cpu,
  ArrowRight,
  Sparkles,
  Users,
  Award,
  CheckCircle,
  HelpCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export default function ReadinessAuditsPage() {
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  // 1. Fetch Readiness Assessments & metadata
  const [page, setPage] = useState(1);
  const { data: pastData, isLoading: assessmentsLoading, refetch: refetchAssessments } =
    useAssessmentsQuery(familyId, { page, limit: 10 });
  const pastAssessments = pastData?.data || [];

  const { data: lifeEvents = [], isLoading: eventsLoading } = useLifeEventsQuery();
  const { data: members = [] } = useFamilyMembersQuery(familyId);
  const { data: documents = [] } = useDocumentsQuery(familyId);

  // Wizard States
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Questionnaire responses
  const [qEmergencyReady, setQEmergencyReady] = useState<"yes" | "no" | null>(null);
  const [qCopiesStored, setQCopiesStored] = useState<"yes" | "no" | null>(null);

  // Post Assessment Celebration Summary
  const [createdAssessment, setCreatedAssessment] = useState<ReadinessAssessmentResponseDto | null>(null);

  // Report Modal States
  const [reportTarget, setReportTarget] = useState<ReadinessAssessmentResponseDto | null>(null);

  const createAssessmentMutation = useCreateAssessmentMutation(familyId);

  // Calculate Dashboard Averages
  const dashboardStats = useMemo(() => {
    if (pastAssessments.length === 0) {
      return { avgScore: 0, auditedCount: 0, warningCount: 0 };
    }
    const sum = pastAssessments.reduce((acc, item) => acc + item.readinessScore, 0);
    const avgScore = Math.round(sum / pastAssessments.length);
    const auditedCount = pastAssessments.length;
    const warningCount = pastAssessments.reduce((acc, item) => acc + (item.expiryWarnings?.length || 0), 0);

    return { avgScore, auditedCount, warningCount };
  }, [pastAssessments]);

  // Map event details helper
  const selectedEvent = useMemo(() => {
    return lifeEvents.find((e) => e.id === selectedEventId);
  }, [lifeEvents, selectedEventId]);

  // Handlers
  const handleOpenWizard = () => {
    setWizardStep(1);
    setSelectedEventId(lifeEvents[0]?.id || "");
    setSelectedMemberId("");
    setQEmergencyReady(null);
    setQCopiesStored(null);
    setCreatedAssessment(null);
    setWizardOpen(true);
  };

  const handleRunAudit = async () => {
    if (!selectedEventId) return;

    try {
      const result = await createAssessmentMutation.mutateAsync({
        lifeEventId: selectedEventId,
        familyMemberId: selectedMemberId || null,
      });

      setCreatedAssessment(result);
      setWizardStep(4);
      toast.success("Readiness Audit Scan completed successfully!");
      refetchAssessments();
    } catch {
      toast.error("Failed to run readiness assessment.");
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case "complete":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 select-none">
            <ShieldCheck className="h-3.5 w-3.5" />
            Complete
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20 select-none">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20 select-none">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            Incomplete
          </span>
        );
    }
  };

  return (
    <PageContainer>
      {/* Header section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <span className="inline-flex items-center gap-1.5 w-max rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
            <Award className="h-3.5 w-3.5" />
            Audits & Compliance
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mt-1.5 font-sans">
            Readiness Assessments
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Conduct document checks and compliance audits for major life events.
          </p>
        </div>

        <Button
          onClick={handleOpenWizard}
          className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-white h-9 text-xs"
        >
          <FileCheck className="h-4.5 w-4.5 shrink-0" />
          Start New Audit
        </Button>
      </div>

      {/* 2. Stats Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8 select-none animate-in fade-in duration-300 delay-75">
        {/* Score gauge visual */}
        <Card className="bg-card/45 border-border/80 lg:col-span-2">
          <CardContent className="p-5 flex items-center gap-6">
            <div className="relative shrink-0 flex items-center justify-center h-24 w-24">
              {/* Circular track */}
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className="stroke-secondary/20"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className="stroke-accent transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * dashboardStats.avgScore) / 100}
                />
              </svg>
              <span className="text-2xl font-black text-foreground">{dashboardStats.avgScore}%</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Aggregate Readiness
              </span>
              <h3 className="text-lg font-bold text-foreground">Family Readiness Level</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluated average preparedness across all audited scenarios.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Audited Count */}
        <Card className="bg-card/45 border-border/80">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Audits Conducted
              </span>
              <h3 className="text-2xl font-extrabold text-foreground">{dashboardStats.auditedCount}</h3>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Total event scenarios evaluated.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-secondary/30 text-indigo-400">
              <History className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card className="bg-card/45 border-border/80">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Warnings Flagged
              </span>
              <h3 className="text-2xl font-extrabold text-rose-500">{dashboardStats.warningCount}</h3>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Expired compliance documents.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Past Assessments Table List */}
      <Card className="animate-in fade-in duration-300 delay-100 border-border/80 bg-card/10">
        <CardHeader className="select-none">
          <CardTitle className="text-base font-bold">Past Assessments</CardTitle>
          <CardDescription>
            History log of previous readiness scans. Click a row to view the compliance checklist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessmentsLoading ? (
            <div className="space-y-2 select-none">
              {[1, 2].map((i) => <div key={i} className="h-10 bg-secondary/20 rounded-lg animate-pulse" />)}
            </div>
          ) : pastAssessments.length === 0 ? (
            <div className="text-center py-10 select-none">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2.5" />
              <p className="text-xs text-muted-foreground">No assessments run in this family workspace yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card/30">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/10 text-muted-foreground font-semibold select-none">
                    <th className="py-2.5 px-3.5">Life Event scenario</th>
                    <th className="py-2.5 px-3.5">Assigned Target</th>
                    <th className="py-2.5 px-3.5">Score</th>
                    <th className="py-2.5 px-3.5">Readiness Level</th>
                    <th className="py-2.5 px-3.5">Date Assessed</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {pastAssessments.map((item) => {
                    const memberName = members.find((m) => m.id === item.familyMemberId)?.fullName || "Whole Workspace";
                    const eventName = lifeEvents.find((e) => e.id === item.lifeEventId)?.name || "Compliance Evaluation";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-secondary/10 cursor-pointer transition-colors"
                        onClick={() => setReportTarget(item)}
                      >
                        <td className="py-3 px-3.5 font-bold text-foreground truncate max-w-[200px]">
                          {eventName}
                        </td>
                        <td className="py-3 px-3.5 text-muted-foreground font-semibold">
                          {memberName}
                        </td>
                        <td className="py-3 px-3.5 text-foreground font-extrabold">
                          {item.readinessScore}%
                        </td>
                        <td className="py-3 px-3.5">{getLevelBadge(item.readinessLevel)}</td>
                        <td className="py-3 px-3.5 text-muted-foreground font-medium select-none">
                          {new Date(item.assessedAt || item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setReportTarget(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all outline-none"
                          >
                            View Report
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WIZARD DIALOG MODAL */}
      <Dialog
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Start Readiness Audit"
        description="Verify your document checklists for major life milestones."
        className="max-w-lg select-none"
      >
        {/* Progress Stepper header */}
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase border-b border-border/30 pb-3.5 mb-5">
          <span className={wizardStep >= 1 ? "text-accent" : ""}>1. Scenario Scope</span>
          <ArrowRight className="h-3 w-3" />
          <span className={wizardStep >= 2 ? "text-accent" : ""}>2. Verification Checks</span>
          <ArrowRight className="h-3 w-3" />
          <span className={wizardStep >= 3 ? "text-accent" : ""}>3. Run Audit</span>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Scenario & Member selections */}
          {wizardStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-muted-foreground">Select Life Event milestone</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
                >
                  {lifeEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                {selectedEvent?.description && (
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-1">
                    Description: {selectedEvent.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-muted-foreground">Select Family Member scope</label>
                <select
                  value={selectedMemberId || ""}
                  onChange={(e) => setSelectedMemberId(e.target.value || null)}
                  className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none focus:border-ring/30"
                >
                  <option value="">Whole Family Workspace</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/20">
                <Button variant="outline" size="sm" onClick={() => setWizardOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => setWizardStep(2)}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Verification checks questions */}
          {wizardStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="p-3 border border-indigo-500/20 bg-indigo-500/[0.01] rounded-xl text-xs text-indigo-400 leading-relaxed mb-2">
                <h5 className="font-bold flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5" />
                  Auto Scan Rules
                </h5>
                <p className="text-[10px] mt-1">
                  This scenario scans for:{" "}
                  <strong>
                    {selectedEvent?.expectedDocumentRules?.requiredCategories?.join(", ") || "core documents"}
                  </strong>
                </p>
              </div>

              {/* Question 1 */}
              <div className="space-y-2 text-left">
                <h5 className="text-xs font-bold text-foreground">
                  Are original copies accessible in under 15 minutes in case of emergency?
                </h5>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQEmergencyReady("yes")}
                    className={`flex-1 h-9 rounded-lg border text-xs font-bold transition-all ${
                      qEmergencyReady === "yes"
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-secondary/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yes, fully prepared
                  </button>
                  <button
                    type="button"
                    onClick={() => setQEmergencyReady("no")}
                    className={`flex-1 h-9 rounded-lg border text-xs font-bold transition-all ${
                      qEmergencyReady === "no"
                        ? "border-rose-500/30 bg-rose-500/5 text-rose-500"
                        : "border-border bg-secondary/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    No, not sure
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div className="space-y-2 text-left pt-2">
                <h5 className="text-xs font-bold text-foreground">
                  Are copies stored in a secure fireproof vault or off-site bank deposit?
                </h5>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQCopiesStored("yes")}
                    className={`flex-1 h-9 rounded-lg border text-xs font-bold transition-all ${
                      qCopiesStored === "yes"
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-secondary/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yes, vault protected
                  </button>
                  <button
                    type="button"
                    onClick={() => setQCopiesStored("no")}
                    className={`flex-1 h-9 rounded-lg border text-xs font-bold transition-all ${
                      qCopiesStored === "no"
                        ? "border-rose-500/30 bg-rose-500/5 text-rose-500"
                        : "border-border bg-secondary/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    No, plain folder
                  </button>
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-4 border-t border-border/20">
                <Button variant="outline" size="sm" onClick={() => setWizardStep(1)}>
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={!qEmergencyReady || !qCopiesStored}
                  onClick={() => setWizardStep(3)}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Run Audit Scan trigger */}
          {wizardStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 text-center py-4"
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center mx-auto mb-3.5 shadow-sm text-accent animate-pulse">
                <FileCheck className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Ready to analyze family preparedness?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Running the audit scans your vault registry, matching documents category tags against expected rules.
              </p>

              <div className="flex justify-between gap-2 pt-6 border-t border-border/20">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={createAssessmentMutation.isPending}
                  onClick={() => setWizardStep(2)}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  isLoading={createAssessmentMutation.isPending}
                  disabled={createAssessmentMutation.isPending}
                  onClick={handleRunAudit}
                >
                  Run Audit Scan
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Audit success report details summary */}
          {wizardStep === 4 && createdAssessment && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-foreground">Audit completed!</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Readiness Score: <span className="font-extrabold text-foreground">{createdAssessment.readinessScore}%</span>
                </p>
              </div>

              {/* Gauge Score */}
              <div className="p-4 border border-border bg-secondary/15 rounded-xl text-xs space-y-2.5 text-left max-h-[220px] overflow-y-auto">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Preparedness Rating</span>
                  <span>{getLevelBadge(createdAssessment.readinessLevel)}</span>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-foreground">Next Steps Recommendations</span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {createdAssessment.nextSteps}
                  </p>
                </div>
                {createdAssessment.missingDocuments?.length > 0 && (
                  <div className="space-y-1.5 pt-1.5">
                    <span className="font-bold text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Missing required documents
                    </span>
                    <ul className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
                      {createdAssessment.missingDocuments.map((mDoc, idx) => (
                        <li key={idx} className="list-disc ml-4">
                          {mDoc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-border/20">
                <Button size="sm" onClick={() => setWizardOpen(false)}>
                  Close Wizard & View History
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>

      {/* DETAILED ASSESSMENT REPORT MODAL */}
      <Dialog
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        title="Assessment Report Detail"
        description="Scanned compliance parameter results log."
        className="max-w-2xl select-none"
      >
        {reportTarget && (
          <div className="space-y-5 mt-2 text-xs">
            {/* Header statistics grid */}
            <div className="grid gap-4 sm:grid-cols-3 p-4 border border-border bg-secondary/10 rounded-xl">
              <div className="text-center space-y-1 border-r border-border/40">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Readiness Score</span>
                <h3 className="text-2xl font-black text-foreground">{reportTarget.readinessScore}%</h3>
              </div>
              <div className="text-center space-y-1 border-r border-border/40">
                <span className="text-[9px] font-bold text-muted-foreground uppercase font-sans">Readiness Rating</span>
                <div className="flex justify-center mt-1">{getLevelBadge(reportTarget.readinessLevel)}</div>
              </div>
              <div className="text-center space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Assessed On</span>
                <h3 className="text-xs font-bold text-foreground mt-1.5">
                  {new Date(reportTarget.assessedAt || reportTarget.createdAt).toLocaleDateString()}
                </h3>
              </div>
            </div>

            {/* Checklists grid split */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Available database documents */}
              <div className="space-y-2">
                <h5 className="font-bold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Available documents ({reportTarget.availableDocuments?.length || 0})
                </h5>
                {reportTarget.availableDocuments?.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-2 italic">No matching document matches uploaded.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto p-1 bg-secondary/5 rounded-xl border border-border/40">
                    {reportTarget.availableDocuments.map((doc, idx) => (
                      <div
                        key={idx}
                        onClick={() => (window.location.href = `/dashboard/vault/${doc.documentId}`)}
                        className="flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-secondary/10 transition-colors cursor-pointer"
                      >
                        <span className="font-bold text-foreground truncate max-w-[150px]">{doc.displayName}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{doc.categoryName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing category checklists */}
              <div className="space-y-2">
                <h5 className="font-bold text-rose-500 flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" />
                  Missing document rules ({reportTarget.missingDocuments?.length || 0})
                </h5>
                {reportTarget.missingDocuments?.length === 0 ? (
                  <div className="flex gap-2 items-center p-2.5 border border-emerald-500/25 bg-emerald-500/[0.01] text-emerald-500 rounded-lg">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-[10px] font-semibold">All documentation checklists verified.</span>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[160px] overflow-y-auto p-2 bg-rose-500/[0.02] border border-rose-500/10 rounded-xl text-[10px] text-rose-500">
                    {reportTarget.missingDocuments.map((mDoc, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-semibold">{mDoc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expirations alert section */}
            {reportTarget.expiryWarnings?.length > 0 && (
              <div className="space-y-2 border-t border-border/25 pt-3.5">
                <h5 className="font-bold text-rose-500 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Expirations warning warnings ({reportTarget.expiryWarnings.length})
                </h5>
                <div className="space-y-1 bg-rose-500/[0.02] border border-rose-500/10 p-2.5 rounded-xl text-[10px] text-rose-500">
                  {reportTarget.expiryWarnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                      <span className="font-semibold">{warn.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps AI summary instructions */}
            <div className="space-y-2 border-t border-border/25 pt-3.5 select-all">
              <h5 className="font-bold text-foreground flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-accent" />
                AI Preparedness Suggestions
              </h5>
              <div className="p-3.5 border border-border bg-secondary/15 rounded-xl text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-bold text-foreground mb-1 select-none">Action Checklist</p>
                {reportTarget.nextSteps}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border/20 select-none">
              <Button variant="outline" size="sm" onClick={() => setReportTarget(null)}>
                Close Report
              </Button>
            </div>
          </div>
        )}
      </Dialog>

    </PageContainer>
  );
}
