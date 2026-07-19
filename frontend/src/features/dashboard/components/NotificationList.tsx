"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useNotificationsQuery, useMarkNotificationReadMutation } from "@/features/dashboard/services/queries";
import { Bell, Check, AlertCircle, Info, Sparkles, Inbox } from "lucide-react";
import { Loader } from "@/components/ui/Loader";

export function NotificationList() {
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications for the active family workspace (only unread)
  const { data: notificationsData, isLoading } = useNotificationsQuery(familyId, {
    limit: 10,
    status: "unread",
  });
  const notifications = notificationsData?.data || [];
  
  const markReadMutation = useMarkNotificationReadMutation(familyId);

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

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markReadMutation.mutateAsync(id);
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          bg: "bg-rose-500/10 border-rose-500/20",
          text: "text-rose-500",
          icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
        };
      case "warning":
        return {
          bg: "bg-amber-500/10 border-amber-500/20",
          text: "text-amber-500",
          icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
        };
      case "info":
        return {
          bg: "bg-indigo-500/10 border-indigo-500/20",
          text: "text-indigo-400",
          icon: <Info className="h-4 w-4 text-indigo-400" />,
        };
      default:
        return {
          bg: "bg-zinc-500/10 border-zinc-500/20",
          text: "text-zinc-400",
          icon: <Sparkles className="h-4 w-4 text-zinc-400" />,
        };
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Icon Button */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="relative p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        <Bell className="h-4.5 w-4.5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse select-none">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 z-40 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-soft glassmorphism p-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-border/40 select-none">
            <span className="text-xs font-bold text-foreground">Active Notifications</span>
            {notifications.length > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground/65">
                {notifications.length} Unread
              </span>
            )}
          </div>

          {/* List items */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border/30 mt-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader size="sm" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center select-none text-muted-foreground">
                <Inbox className="h-8 w-8 text-muted-foreground/45 mb-2.5" />
                <p className="text-xs font-semibold">All caught up!</p>
                <p className="text-[10px] max-w-xs mt-0.5 leading-relaxed">
                  No active warnings or alerts for this workspace.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const styles = getSeverityStyles(item.severity);
                return (
                  <div
                    key={item.id}
                    className={`group/item flex items-start gap-3 py-3 px-1.5 hover:bg-secondary/25 rounded-lg transition-colors ${
                      item.status === "unread" ? "bg-zinc-950/20" : ""
                    }`}
                  >
                    {/* Severity Indicator Dot/Icon */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${styles.bg}`}>
                      {styles.icon}
                    </div>

                    {/* Alert text content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-normal truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                        {item.message}
                      </p>
                      <span className="text-[9px] font-medium text-muted-foreground/50 select-none mt-1.5 block">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Read Action button */}
                    <button
                      onClick={(e) => handleMarkRead(item.id, e)}
                      title="Mark as read"
                      className="opacity-0 group-hover/item:opacity-100 p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 outline-none self-center"
                    >
                      <Check className="h-4.5 w-4.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
