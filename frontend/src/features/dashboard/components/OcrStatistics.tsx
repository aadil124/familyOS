"use client";

import React, { useMemo } from "react";
import { DocumentResponseDto } from "../services/types";
import { Card, CardContent } from "@/components/ui/Card";
import { FileText, Cpu, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

interface OcrStatisticsProps {
  documents: DocumentResponseDto[];
}

export function OcrStatistics({ documents }: OcrStatisticsProps) {
  const stats = useMemo(() => {
    const total = documents.length;
    const completed = documents.filter((d) => d.processingStatus === "SUCCESS").length;
    const failed = documents.filter((d) => d.processingStatus === "FAILED").length;
    const queue = total - completed - failed;

    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Sum of mismatch alerts (e.g. documents that have an issueStatus set)
    const discrepancyAlerts = documents.filter(
      (d) => d.issueStatus !== null && d.issueStatus !== undefined && d.issueStatus !== ""
    ).length;

    return {
      total,
      completed,
      failed,
      queue,
      successRate,
      discrepancyAlerts,
    };
  }, [documents]);

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 select-none">
      
      {/* Total Processed */}
      <Card className="bg-card/45 relative overflow-hidden border-border/80">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Indexed Assets
            </span>
            <h3 className="text-2xl font-extrabold text-foreground">{stats.total}</h3>
            <p className="text-[9px] text-muted-foreground leading-normal">
              Total files registered in vault.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-border bg-secondary/30 text-indigo-400">
            <FileText className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Success Rate */}
      <Card className="bg-card/45 relative overflow-hidden border-border/80">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Extraction Rate
            </span>
            <h3 className="text-2xl font-extrabold text-foreground">{stats.successRate}%</h3>
            <p className="text-[9px] text-muted-foreground leading-normal">
              Success rate of optical character processing.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-border bg-secondary/30 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Discrepancy Warnings */}
      <Card className="bg-card/45 relative overflow-hidden border-border/80">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Compliance Warnings
            </span>
            <h3 className="text-2xl font-extrabold text-rose-500">{stats.discrepancyAlerts}</h3>
            <p className="text-[9px] text-muted-foreground leading-normal">
              Flagged parameter mismatch alerts.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-border bg-secondary/30 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Model Confidence (Static / Simulated benchmark stats) */}
      <Card className="bg-card/45 relative overflow-hidden border-indigo-500/20 bg-indigo-500/[0.01]">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              AI Confidence
            </span>
            <h3 className="text-2xl font-extrabold text-foreground">94.8%</h3>
            <p className="text-[9px] text-muted-foreground leading-normal">
              Average confidence of field mappings.
            </p>
          </div>
          <div className="p-3 rounded-xl border border-border bg-secondary/30 text-indigo-400">
            <Cpu className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
