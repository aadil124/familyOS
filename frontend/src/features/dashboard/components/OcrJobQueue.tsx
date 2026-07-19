"use client";

import React, { useState, useMemo } from "react";
import { DocumentResponseDto } from "../services/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import {
  FileText,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface OcrJobQueueProps {
  documents: DocumentResponseDto[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function OcrJobQueue({ documents, isLoading = false, onRefresh }: OcrJobQueueProps) {
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});

  const activeJobs = useMemo(() => {
    return documents.filter(
      (d) =>
        d.processingStatus === "PENDING" ||
        d.processingStatus === "OCR_PROCESSING" ||
        d.processingStatus === "AI_PROCESSING"
    );
  }, [documents]);

  const historicalJobs = useMemo(() => {
    return documents
      .filter((d) => d.processingStatus === "SUCCESS" || d.processingStatus === "FAILED")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [documents]);

  const handleRetry = async (docId: string, displayName: string) => {
    setRetryingIds((prev) => ({ ...prev, [docId]: true }));
    // Simulate retry job latency
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setRetryingIds((prev) => ({ ...prev, [docId]: false }));
    toast.success(`OCR Job successfully restarted for: "${displayName}" (Simulated)`);
    if (onRefresh) {
      onRefresh();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 select-none">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20 select-none">
            <AlertTriangle className="h-3 w-3" />
            Failed
          </span>
        );
      case "OCR_PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20 select-none animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            OCR Processing
          </span>
        );
      case "AI_PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-500 border border-indigo-500/20 select-none animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            AI Extracting
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-500/20 select-none">
            <Clock className="h-3 w-3" />
            Pending Queue
          </span>
        );
    }
  };

  const formatDuration = (createdStr: string, updatedStr: string) => {
    const start = new Date(createdStr).getTime();
    const end = new Date(updatedStr).getTime();
    const diffSec = Math.max(1, Math.round((end - start) / 1000));
    if (diffSec >= 60) {
      const min = Math.floor(diffSec / 60);
      const sec = diffSec % 60;
      return `${min}m ${sec}s`;
    }
    return `${diffSec}s`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 select-none">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-4 p-4 border border-border/40 rounded-xl bg-card">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2 py-0.5">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Active Processing Jobs */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase select-none mb-3">
          Active Processing Pipeline ({activeJobs.length})
        </h3>
        {activeJobs.length === 0 ? (
          <div className="flex gap-3 items-center p-3.5 border border-emerald-500/15 bg-emerald-500/[0.01] rounded-xl text-emerald-500 text-xs select-none">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>All document intelligence jobs are processed. Queue is idle.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <Card key={job.id} className="bg-card/30 relative overflow-hidden select-none border-border/60">
                {/* Horizontal progress scanner line for premium styling */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-accent/30 overflow-hidden">
                  <div className="h-full bg-accent w-1/3 animate-infinite-slide" />
                </div>
                <CardContent className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg border border-border bg-secondary/30 shrink-0">
                      <FileText className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                        {job.displayName}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        Started: {new Date(job.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(job.processingStatus)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 2. Historical Completed Jobs */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase select-none mb-3">
          Recently Completed Jobs
        </h3>
        {historicalJobs.length === 0 ? (
          <p className="text-xs text-muted-foreground select-none py-2">No historical jobs logged yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/20 text-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/15 text-muted-foreground font-semibold select-none">
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Pipeline Status</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Finished At</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25">
                {historicalJobs.map((job) => {
                  const isRetrying = !!retryingIds[job.id];
                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-secondary/10 cursor-pointer transition-colors"
                      onClick={() => (window.location.href = `/dashboard/vault/${job.id}`)}
                    >
                      <td className="py-3 px-3 font-bold text-foreground truncate max-w-[150px]">
                        {job.displayName}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(job.processingStatus)}</td>
                      <td className="py-3 px-3 text-muted-foreground font-medium select-none">
                        {formatDuration(job.createdAt, job.updatedAt)}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-medium select-none">
                        {new Date(job.updatedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRetry(job.id, job.displayName)}
                          disabled={isRetrying}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1 font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-40 outline-none"
                          title="Reprocess document"
                        >
                          <RotateCcw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
                          <span>Retry</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

