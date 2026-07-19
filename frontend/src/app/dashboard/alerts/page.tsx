"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useDocumentsQuery,
} from "@/features/dashboard/services/queries";
import { NotificationResponseDto } from "@/features/dashboard/services/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellRing,
  CheckCheck,
  Search,
  SlidersHorizontal,
  Mail,
  Smartphone,
  PhoneCall,
  Calendar,
  AlertOctagon,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  BellOff,
  Bell,
  Activity,
  RefreshCw,
  X,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CustomReminder {
  id: string;
  title: string;
  dueDate: string;
  priority: "critical" | "warning" | "info";
  notes?: string;
  completed?: boolean;
}

export default function NotificationsCenterPage() {
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  // Active Tab: "alerts", "reminders", "preferences"
  const [activeTab, setActiveTab] = useState<"alerts" | "reminders" | "preferences">("alerts");

  // --- Filter states ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("unread");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch in-app notifications
  const { data: notificationsData, isLoading: alertsLoading, refetch: refetchAlerts } =
    useNotificationsQuery(familyId, { page, limit });
  const rawNotifications = useMemo(() => notificationsData?.data || [], [notificationsData]);

  const { data: documents = [] } = useDocumentsQuery(familyId);

  const markReadMutation = useMarkNotificationReadMutation(familyId);

  // Local Dismissed list for simulated deletes
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem(`alerts_dismissed_${familyId || "global"}`);
    if (saved) {
      setDismissedIds(JSON.parse(saved));
    }
  }, [familyId]);

  const handleDismissAlert = useCallback((id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem(`alerts_dismissed_${familyId || "global"}`, JSON.stringify(updated));
    toast.success("Alert dismissed.");
  }, [dismissedIds, familyId]);

  // Filter & Search Notifications
  const filteredNotifications = useMemo(() => {
    return rawNotifications
      .filter((item) => !dismissedIds.includes(item.id))
      .filter((item) => {
        const matchSearch =
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.message.toLowerCase().includes(searchQuery.toLowerCase());

        const isRead = !!item.readAt;
        const matchStatus =
          statusFilter === "all" ||
          (statusFilter === "read" && isRead) ||
          (statusFilter === "unread" && !isRead);

        const matchPriority =
          priorityFilter === "all" || item.severity.toLowerCase() === priorityFilter;

        return matchSearch && matchStatus && matchPriority;
      });
  }, [rawNotifications, dismissedIds, searchQuery, statusFilter, priorityFilter]);

  // Unread count
  const unreadCount = useMemo(() => {
    return rawNotifications.filter((item) => !item.readAt && !dismissedIds.includes(item.id)).length;
  }, [rawNotifications, dismissedIds]);

  // --- Reminders CRUD (Local Storage) ---
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const [newReminderPriority, setNewReminderPriority] = useState<"critical" | "warning" | "info">("warning");
  const [newReminderNotes, setNewReminderNotes] = useState("");

  // Load custom reminders
  useEffect(() => {
    const saved = localStorage.getItem(`alerts_custom_${familyId || "global"}`);
    if (saved) {
      setCustomReminders(JSON.parse(saved));
    } else {
      setCustomReminders([]);
    }
  }, [familyId]);

  const handleCreateReminder = () => {
    if (!newReminderTitle || !newReminderDate) {
      toast.error("Please specify a title and due date.");
      return;
    }
    const newRem: CustomReminder = {
      id: Math.random().toString(36).substring(2, 11),
      title: newReminderTitle,
      dueDate: newReminderDate,
      priority: newReminderPriority,
      notes: newReminderNotes,
      completed: false,
    };
    const updated = [...customReminders, newRem];
    setCustomReminders(updated);
    localStorage.setItem(`alerts_custom_${familyId || "global"}`, JSON.stringify(updated));
    setReminderDialogOpen(false);
    setNewReminderTitle("");
    setNewReminderDate("");
    setNewReminderPriority("warning");
    setNewReminderNotes("");
    toast.success("Reminder created.");
  };

  const handleToggleReminder = (id: string) => {
    const updated = customReminders.map((rem) =>
      rem.id === id ? { ...rem, completed: !rem.completed } : rem
    );
    setCustomReminders(updated);
    localStorage.setItem(`alerts_custom_${familyId || "global"}`, JSON.stringify(updated));
    toast.success("Reminder status updated.");
  };

  const handleSnoozeReminder = (id: string) => {
    const updated = customReminders.map((rem) => {
      if (rem.id === id) {
        const d = new Date(rem.dueDate);
        d.setDate(d.getDate() + 7);
        return { ...rem, dueDate: d.toISOString().split("T")[0] };
      }
      return rem;
    });
    setCustomReminders(updated);
    localStorage.setItem(`alerts_custom_${familyId || "global"}`, JSON.stringify(updated));
    toast.success("Reminder snoozed for 7 days.");
  };

  const handleDeleteReminder = (id: string) => {
    const updated = customReminders.filter((rem) => rem.id !== id);
    setCustomReminders(updated);
    localStorage.setItem(`alerts_custom_${familyId || "global"}`, JSON.stringify(updated));
    toast.success("Reminder deleted.");
  };

  // Compile Document Expiry Reminders
  const documentExpirations = useMemo(() => {
    const now = new Date();
    return documents
      .filter((doc) => doc.expiresAt && doc.processingStatus === "SUCCESS")
      .map((doc) => {
        const expiryDate = new Date(doc.expiresAt!);
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let priority: "critical" | "warning" | "info" = "info";
        if (diffDays <= 0) {
          priority = "critical";
        } else if (diffDays <= 30) {
          priority = "warning";
        }
        return {
          id: doc.id,
          title: `Document Expiry: ${doc.displayName}`,
          dueDate: doc.expiresAt!.split("T")[0],
          priority,
          notes: diffDays <= 0 ? "Expired" : `Expires in ${diffDays} days`,
          isDocument: true,
        };
      });
  }, [documents]);

  const allReminders = useMemo(() => {
    const customList = customReminders.map((r) => ({ ...r, isDocument: false }));
    return [...documentExpirations, ...customList].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [customReminders, documentExpirations]);

  // --- Notification Preferences ---
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefPush, setPrefPush] = useState(true);
  const [prefSms, setPrefSms] = useState(false);
  const [prefInApp, setPrefInApp] = useState(true);
  const [prefFrequency, setPrefFrequency] = useState("daily");
  const [prefQuietHours, setPrefQuietHours] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`alerts_prefs_${familyId || "global"}`);
    if (saved) {
      const p = JSON.parse(saved);
      setPrefEmail(p.email ?? true);
      setPrefPush(p.push ?? true);
      setPrefSms(p.sms ?? false);
      setPrefInApp(p.inApp ?? true);
      setPrefFrequency(p.frequency ?? "daily");
      setPrefQuietHours(p.quietHours ?? false);
    }
  }, [familyId]);

  const handleSavePreferences = () => {
    const config = {
      email: prefEmail,
      push: prefPush,
      sms: prefSms,
      inApp: prefInApp,
      frequency: prefFrequency,
      quietHours: prefQuietHours,
    };
    localStorage.setItem(`alerts_prefs_${familyId || "global"}`, JSON.stringify(config));
    toast.success("Notification preferences saved successfully!");
  };

  // Drawer details target
  const [drawerAlert, setDrawerAlert] = useState<NotificationResponseDto | null>(null);

  const getPriorityStyles = (p: string) => {
    switch (p.toLowerCase()) {
      case "critical":
        return {
          badge: "bg-rose-500/10 border-rose-500/20 text-rose-500",
          cardBorder: "border-l-4 border-l-rose-500 border-border/70",
          icon: <AlertOctagon className="h-4 w-4 text-rose-500" />,
        };
      case "warning":
        return {
          badge: "bg-amber-500/10 border-amber-500/20 text-amber-500",
          cardBorder: "border-l-4 border-l-amber-500 border-border/70",
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        };
      default:
        return {
          badge: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
          cardBorder: "border-l-4 border-l-indigo-500 border-border/70",
          icon: <Info className="h-4 w-4 text-indigo-400" />,
        };
    }
  };

  // Get countdown string and color
  const getCountdownChip = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black text-rose-500 select-none">
          Overdue
        </span>
      );
    } else if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black text-amber-500 select-none">
          Due Today
        </span>
      );
    } else if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black text-amber-500 select-none">
          {days}d left
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black text-emerald-400 select-none">
          {days}d left
        </span>
      );
    }
  };

  const handleMarkAllRead = async () => {
    const unreadVisible = filteredNotifications.filter((n) => !n.readAt);
    if (unreadVisible.length === 0) return;

    try {
      await Promise.all(unreadVisible.map((n) => markReadMutation.mutateAsync(n.id)));
      toast.success("All visible notifications marked as read.");
      refetchAlerts();
    } catch {
      toast.error("Failed to mark all as read.");
    }
  };

  return (
    <PageContainer>
      {/* Header section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <span className="inline-flex items-center gap-1.5 w-max rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            <BellRing className="h-3.5 w-3.5" />
            Alerts Hub
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mt-1.5 font-sans">
            Notifications & Reminders
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Stay updated with document expirations, audit warnings, and custom action reminders.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === "reminders" && (
            <Button
              onClick={() => setReminderDialogOpen(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-white h-9 text-xs"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Reminder
            </Button>
          )}
          <Button
            onClick={() => refetchAlerts()}
            variant="outline"
            className="flex items-center gap-2 h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs list controls */}
      <div className="flex gap-2 border-b border-border/40 pb-px mb-6 select-none animate-in fade-in duration-300">
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 relative ${
            activeTab === "alerts"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          In-App Alerts
          {unreadCount > 0 && (
            <span className="ml-1.5 relative inline-flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-white text-[9px] font-black items-center justify-center">
                {unreadCount}
              </span>
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("reminders")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === "reminders"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Reminders Timeline
        </button>
        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === "preferences"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Preferences
        </button>
      </div>

      {/* ACTIVE TABS SWITCH */}
      <div className="relative">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ALERTS BROWSER */}
          {activeTab === "alerts" && (
            <motion.div
              key="tab-alerts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Filter controls row */}
              <Card className="bg-card/45 border-border/80 p-4 select-none">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between text-xs">
                  {/* Search */}
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-secondary/10 pl-9 pr-3 text-xs outline-none focus:border-ring/30"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-bold text-muted-foreground">Status:</span>
                    </div>
                    <div className="flex bg-secondary/20 p-0.5 rounded-lg border border-border/60">
                      {(["all", "unread", "read"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-black capitalize transition-all ${
                            statusFilter === st
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="font-bold text-muted-foreground">Priority:</span>
                    </div>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value as "all" | "critical" | "warning" | "info")}
                      className="h-8 rounded-lg border border-border bg-secondary/10 px-2 text-[11px] font-bold outline-none"
                    >
                      <option value="all">All Priorities</option>
                      <option value="critical">Critical Only</option>
                      <option value="warning">Warning Only</option>
                      <option value="info">Info Only</option>
                    </select>

                    <button
                      onClick={handleMarkAllRead}
                      disabled={filteredNotifications.filter((n) => !n.readAt).length === 0}
                      className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border/80 bg-secondary/40 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-all ml-auto md:ml-0"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark All Read
                    </button>
                  </div>
                </div>
              </Card>

              {/* Notifications feed */}
              {alertsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 p-4 border border-border bg-card/10 rounded-xl items-center animate-pulse">
                      <div className="h-10 w-10 bg-secondary/20 rounded-lg shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-1/4 bg-secondary/20 rounded" />
                        <div className="h-3 w-3/4 bg-secondary/20 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-16 bg-card/25 border border-border/60 rounded-2xl select-none max-w-lg mx-auto">
                  <BellOff className="h-12 w-12 text-muted-foreground/35 mx-auto mb-3.5" />
                  <h4 className="text-base font-bold text-foreground">No alerts found</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-normal">
                    You have caught up with all tasks. Active warning checks display here when triggered.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-300 relative border-l border-border/40 ml-5 pl-6">
                  {filteredNotifications.map((item) => {
                    const isRead = !!item.readAt;
                    const style = getPriorityStyles(item.severity);

                    return (
                      <motion.div
                        layoutId={`alert-${item.id}`}
                        key={item.id}
                        onClick={() => setDrawerAlert(item)}
                        className={`p-4 border rounded-xl flex items-start gap-4 transition-all relative cursor-pointer hover:border-accent/40 ${style.cardBorder} ${
                          isRead
                            ? "bg-card/30 border-border/50 opacity-75 hover:opacity-100"
                            : "bg-card/75 border-indigo-500/20 shadow-glow/5"
                        }`}
                      >
                        {/* Timeline dot connector */}
                        <span className="absolute -left-[31px] top-4.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-background border border-border/60 select-none">
                          <span className={`h-1.5 w-1.5 rounded-full ${!isRead ? "bg-accent animate-pulse" : "bg-muted-foreground/30"}`} />
                        </span>

                        <div className="p-2 rounded-lg border border-border bg-secondary/35 shrink-0 text-muted-foreground select-none">
                          {style.icon}
                        </div>

                        <div className="space-y-1 flex-1 text-left min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`text-xs font-black text-foreground ${!isRead ? "text-indigo-400" : ""}`}>
                              {item.title}
                            </h4>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase border ${style.badge}`}>
                              {item.severity}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider bg-secondary/40 px-1.5 py-0.5 rounded">
                              {item.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed truncate">
                            {item.message}
                          </p>
                          <div className="flex items-center gap-4 text-[9px] text-muted-foreground/50 select-none mt-1">
                            <span>Received: {new Date(item.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 shrink-0 select-none" onClick={(e) => e.stopPropagation()}>
                          {!isRead && (
                            <button
                              onClick={() => {
                                markReadMutation.mutate(item.id);
                                toast.success("Marked as read.");
                              }}
                              className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all outline-none"
                              title="Mark as read"
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDismissAlert(item.id)}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 transition-all outline-none"
                            title="Dismiss alert"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {filteredNotifications.length > 0 && (
                <div className="flex justify-between items-center select-none pt-2">
                  <span className="text-[10px] text-muted-foreground font-bold">
                    Showing page {page} of visible alerts
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className="h-8 text-xs font-bold"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filteredNotifications.length < limit}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-8 text-xs font-bold"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: REMINDERS TIMELINE */}
          {activeTab === "reminders" && (
            <motion.div
              key="tab-reminders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 lg:grid-cols-3"
            >
              {/* Reminders list */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border/80 bg-card/10">
                  <CardHeader className="select-none">
                    <CardTitle className="text-base font-bold">Upcoming Reminders Timeline</CardTitle>
                    <CardDescription>
                      Expired or upcoming renewal checkpoints aggregated across digital vault registry.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {allReminders.length === 0 ? (
                      <div className="text-center py-16 select-none">
                        <Clock className="h-10 w-10 text-muted-foreground/45 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-foreground">No reminders registered</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Add a custom alert renewal or upload files to get started.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border-l border-border/50 ml-4 pl-6 space-y-5 animate-in fade-in duration-300">
                        {allReminders.map((rem) => {
                          const isExpired = new Date(rem.dueDate) < new Date();
                          const isCompleted = "completed" in rem && (rem as CustomReminder).completed;

                          return (
                            <div key={rem.id} className="relative group text-xs text-left">
                              {/* Dot indicator */}
                              <span className="absolute -left-[31px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-card border border-border select-none">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isCompleted
                                      ? "bg-emerald-500"
                                      : rem.priority === "critical"
                                      ? "bg-rose-500 animate-ping"
                                      : rem.priority === "warning"
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
                                  }`}
                                />
                              </span>

                              <div className="flex gap-4 justify-between items-start">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`font-black ${
                                        isCompleted
                                          ? "line-through text-muted-foreground"
                                          : isExpired
                                          ? "text-rose-500"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {rem.title}
                                    </span>
                                    {getCountdownChip(rem.dueDate)}
                                    {rem.isDocument && (
                                      <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground select-none">
                                        Registry File
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground mt-1 select-none">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Due Date: {new Date(rem.dueDate).toLocaleDateString()}
                                    </span>
                                    {rem.notes && (
                                      <span className="font-semibold text-indigo-400">
                                        {rem.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1 shrink-0 select-none opacity-45 group-hover:opacity-100 transition-opacity">
                                  {!rem.isDocument && (
                                    <>
                                      <button
                                        onClick={() => handleToggleReminder(rem.id)}
                                        className={`p-1.5 rounded border border-border transition-all hover:bg-secondary ${
                                          isCompleted ? "text-emerald-500" : "text-muted-foreground"
                                        }`}
                                        title={isCompleted ? "Mark active" : "Mark completed"}
                                      >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleSnoozeReminder(rem.id)}
                                        className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                                        title="Snooze 7 days"
                                      >
                                        <Clock className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteReminder(rem.id)}
                                        className="p-1.5 rounded border border-border hover:bg-rose-500/5 hover:text-rose-500 text-muted-foreground transition-all"
                                        title="Delete reminder"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {rem.isDocument && (
                                    <button
                                      onClick={() => (window.location.href = `/dashboard/vault/${rem.id}`)}
                                      className="inline-flex items-center gap-1 px-2.5 h-6.5 rounded border border-border bg-secondary/35 text-[9px] font-bold text-muted-foreground hover:text-foreground transition-all"
                                    >
                                      Inspect File
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar stats panel */}
              <div className="space-y-4">
                <Card className="bg-card/45 border-border/80 select-none">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Activity className="h-4.5 w-4.5 text-indigo-400" />
                      Overview Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3.5 text-xs text-left">
                    <div className="flex justify-between border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Document Renewals</span>
                      <span className="font-extrabold text-foreground">{documentExpirations.length}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Active Custom Alerts</span>
                      <span className="font-extrabold text-foreground">
                        {customReminders.filter((r) => !r.completed).length}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Critical Warnings</span>
                      <span className="font-extrabold text-rose-500">
                        {allReminders.filter((r) => r.priority === "critical").length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* TAB 3: PREFERENCES FORM */}
          {activeTab === "preferences" && (
            <motion.div
              key="tab-preferences"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl select-none mx-auto text-left"
            >
              <Card className="border-border/80 bg-card/45">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
                    Delivery Settings
                  </CardTitle>
                  <CardDescription>
                    Configure where and how frequently you receive alert notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-xs">
                  
                  {/* Delivery Channels */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-foreground pb-1.5 border-b border-border/40 text-xs flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      Delivery Channels
                    </h4>
                    
                    {/* Email */}
                    <div className="flex items-center justify-between p-3.5 border border-border bg-card/30 rounded-xl">
                      <div className="space-y-0.5">
                        <h5 className="font-extrabold text-foreground flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          Email Dispatcher
                        </h5>
                        <p className="text-[10px] text-muted-foreground">Send weekly summaries and critical warning logs.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefEmail}
                        onChange={(e) => setPrefEmail(e.target.checked)}
                        className="h-4.5 w-4.5 accent-accent"
                      />
                    </div>

                    {/* Push */}
                    <div className="flex items-center justify-between p-3.5 border border-border bg-card/30 rounded-xl">
                      <div className="space-y-0.5">
                        <h5 className="font-extrabold text-foreground flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                          Push Notifications
                        </h5>
                        <p className="text-[10px] text-muted-foreground">Trigger browser alerts immediately when scans finish.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefPush}
                        onChange={(e) => setPrefPush(e.target.checked)}
                        className="h-4.5 w-4.5 accent-accent"
                      />
                    </div>

                    {/* SMS */}
                    <div className="flex items-center justify-between p-3.5 border border-border bg-card/30 rounded-xl">
                      <div className="space-y-0.5">
                        <h5 className="font-extrabold text-foreground flex items-center gap-1.5">
                          <PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />
                          SMS text alerts
                        </h5>
                        <p className="text-[10px] text-muted-foreground">Send emergency texts directly to your phone.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefSms}
                        onChange={(e) => setPrefSms(e.target.checked)}
                        className="h-4.5 w-4.5 accent-accent"
                      />
                    </div>

                    {/* In-app */}
                    <div className="flex items-center justify-between p-3.5 border border-border bg-card/30 rounded-xl">
                      <div className="space-y-0.5">
                        <h5 className="font-extrabold text-foreground flex items-center gap-1.5">
                          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                          In-App Alerts
                        </h5>
                        <p className="text-[10px] text-muted-foreground">Display badge counter markers in the layout bar.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefInApp}
                        onChange={(e) => setPrefInApp(e.target.checked)}
                        className="h-4.5 w-4.5 accent-accent"
                      />
                    </div>
                  </div>

                  {/* Timing Configs */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Reminder Frequency</label>
                      <select
                        value={prefFrequency}
                        onChange={(e) => setPrefFrequency(e.target.value)}
                        className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none"
                      >
                        <option value="daily">Daily scans summary</option>
                        <option value="weekly">Weekly digest scans</option>
                        <option value="monthly">Monthly audit logs</option>
                      </select>
                    </div>

                    {/* Quiet Hours */}
                    <div className="flex flex-col gap-2 p-3 border border-border bg-card/10 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          Quiet Hours
                        </span>
                        <input
                          type="checkbox"
                          checked={prefQuietHours}
                          onChange={(e) => setPrefQuietHours(e.target.checked)}
                          className="h-4.5 w-4.5 accent-accent"
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        Mute SMS or email warnings from 10:00 PM to 7:00 AM local time.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border/20">
                    <Button onClick={handleSavePreferences} className="bg-accent hover:bg-accent/80 text-white">
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>

        {/* DETAILED NOTIFICATION DRAWER (SLIDE OVER) */}
        <AnimatePresence>
          {drawerAlert && (
            <>
              {/* Overlay background */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerAlert(null)}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 cursor-pointer select-none"
              />

              {/* Drawer panel */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-card border-l border-border/80 z-50 p-6 shadow-xl flex flex-col justify-between text-left select-all"
              >
                <div className="space-y-6">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-border/30 pb-4 select-none">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-indigo-400" />
                      <span className="text-xs font-black text-foreground">Alert Details</span>
                    </div>
                    <button
                      onClick={() => setDrawerAlert(null)}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Drawer Content */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 select-none">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${getPriorityStyles(drawerAlert.severity).badge}`}>
                          {drawerAlert.severity}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider bg-secondary/40 px-1.5 py-0.5 rounded">
                          {drawerAlert.type}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-foreground">
                        {drawerAlert.title}
                      </h3>
                    </div>

                    <div className="p-4 border border-border bg-secondary/15 rounded-xl text-xs leading-relaxed text-muted-foreground">
                      {drawerAlert.message}
                    </div>

                    <div className="space-y-2 text-[11px] text-muted-foreground border-t border-border/30 pt-4 select-none">
                      <div className="flex justify-between">
                        <span>Created Date</span>
                        <span className="font-bold text-foreground">
                          {new Date(drawerAlert.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {(drawerAlert.readAt) && (
                        <div className="flex justify-between">
                          <span>Marked Read</span>
                          <span className="font-bold text-emerald-500">
                            {new Date(drawerAlert.readAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions bottom */}
                <div className="border-t border-border/30 pt-4 flex gap-2 select-none">
                  {!drawerAlert.readAt && (
                    <Button
                      onClick={async () => {
                        await markReadMutation.mutateAsync(drawerAlert.id);
                        toast.success("Alert marked as read.");
                        refetchAlerts();
                        setDrawerAlert(null);
                      }}
                      className="flex-1 bg-accent hover:bg-accent/80 text-white text-xs font-bold"
                    >
                      Mark as Read
                    </Button>
                  )}
                  {drawerAlert.relatedDocumentId && (
                    <Button
                      onClick={() => (window.location.href = `/dashboard/vault/${drawerAlert.relatedDocumentId}`)}
                      variant="outline"
                      className="flex-1 text-xs font-bold"
                    >
                      View Document
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      handleDismissAlert(drawerAlert.id);
                      setDrawerAlert(null);
                    }}
                    variant="ghost"
                    className="p-2 text-danger hover:bg-danger/5 hover:text-danger border border-transparent hover:border-danger/10"
                    title="Dismiss alert"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* CREATE REMINDER DIALOG MODAL */}
      <Dialog
        isOpen={reminderDialogOpen}
        onClose={() => setReminderDialogOpen(false)}
        title="Schedule custom reminder"
        description="Configure target dates, notes, and priority badges."
        className="max-w-md select-none"
      >
        <div className="space-y-4 text-left text-xs mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground">Reminder Title</label>
            <input
              type="text"
              placeholder="e.g. Renew medical card registry"
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-secondary/20 px-3 text-xs outline-none focus:border-ring/30"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={newReminderDate}
                onChange={(e) => setNewReminderDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-secondary/20 px-3 text-xs outline-none focus:border-ring/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground">Priority Badge</label>
              <select
                value={newReminderPriority}
                onChange={(e) => setNewReminderPriority(e.target.value as "critical" | "warning" | "info")}
                className="w-full h-9 rounded-lg border border-border bg-secondary/20 px-3 text-xs outline-none focus:border-ring/30"
              >
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground">Notes / Descriptions (Optional)</label>
            <textarea
              placeholder="Provide extra context details..."
              value={newReminderNotes}
              onChange={(e) => setNewReminderNotes(e.target.value)}
              className="w-full h-20 rounded-lg border border-border bg-secondary/20 p-3 text-xs outline-none focus:border-ring/30 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/20">
            <Button variant="outline" size="sm" onClick={() => setReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateReminder}>
              Create Reminder
            </Button>
          </div>
        </div>
      </Dialog>

    </PageContainer>
  );
}
