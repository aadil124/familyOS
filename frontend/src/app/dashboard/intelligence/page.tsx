"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useDocumentsQuery } from "@/features/dashboard/services/queries";
import { OcrStatistics } from "@/features/dashboard/components/OcrStatistics";
import { OcrJobQueue } from "@/features/dashboard/components/OcrJobQueue";
import {
  Sparkles,
  RefreshCw,
  Search,
  Cpu,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentIntelligencePage() {
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  // 1. Fetch vault files
  const { data: documents = [], isLoading, refetch } = useDocumentsQuery(familyId);

  // Tabs State
  const [activeTab, setActiveTab] = useState<"pipeline" | "extracted">("pipeline");

  // Registry list states
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"displayName" | "createdAt">("displayName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const limit = 6;

  // Dynamic Polling: Refetches vault files every 3 seconds if any item is active in the processing pipeline
  useEffect(() => {
    const hasActive = documents.some(
      (d) =>
        d.processingStatus === "PENDING" ||
        d.processingStatus === "OCR_PROCESSING" ||
        d.processingStatus === "AI_PROCESSING"
    );

    if (hasActive) {
      const interval = setInterval(() => {
        refetch();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents, refetch]);

  // Filters successfully processed files
  const processedDocs = useMemo(() => {
    return documents.filter((d) => d.processingStatus === "SUCCESS");
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return processedDocs
      .filter((d) => d.displayName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const valA = a[sortBy] ?? "";
        const valB = b[sortBy] ?? "";
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
  }, [processedDocs, search, sortBy, sortOrder]);

  const paginatedDocs = useMemo(() => {
    const skip = (page - 1) * limit;
    return filteredDocs.slice(skip, skip + limit);
  }, [filteredDocs, page]);

  const totalPages = Math.ceil(filteredDocs.length / limit) || 1;

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleManualRefresh = () => {
    refetch();
    toast.success("Intelligence hub refetched.");
  };

  return (
    <PageContainer>
      {/* Header section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <span className="inline-flex items-center gap-1.5 w-max rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
            <Cpu className="h-3.5 w-3.5" />
            AI Compliance Engine
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mt-1.5 font-sans">
            AI Document Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor OCR queue durations, AI data extraction values, and verify registry discrepancies.
          </p>
        </div>

        <Button
          onClick={handleManualRefresh}
          variant="outline"
          className="flex items-center gap-2 border-border/80 text-muted-foreground hover:text-foreground h-9 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          Refetch Hub
        </Button>
      </div>

      {/* Statistics Cards Component */}
      <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
        <OcrStatistics documents={documents} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 mb-6 select-none animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 outline-none ${
            activeTab === "pipeline"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Pipeline Overview & Queue
        </button>
        <button
          onClick={() => setActiveTab("extracted")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 outline-none ${
            activeTab === "extracted"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Extracted AI Parameters ({processedDocs.length})
        </button>
      </div>

      {/* Tab content 1: Pipeline & Queue */}
      {activeTab === "pipeline" && (
        <div className="animate-in fade-in duration-300">
          <Card>
            <CardHeader className="select-none">
              <CardTitle className="text-base font-bold">Extraction Job Queue</CardTitle>
              <CardDescription>
                Track files traversing character scanner models. Active queues automatically auto-refresh.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OcrJobQueue
                documents={documents}
                isLoading={isLoading}
                onRefresh={refetch}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab content 2: Extracted AI Parameters Registry */}
      {activeTab === "extracted" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Card>
            <CardHeader className="select-none pb-4">
              <CardTitle className="text-base font-bold">AI Scanned Registries</CardTitle>
              <CardDescription>
                Review extracted parameters side-by-side with discrepancy warnings. Click a row to view specific preview canvas details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Toolbar */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Search scanned file title..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-9 rounded-lg border border-border/80 bg-secondary/15 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
                />
              </div>

              {filteredDocs.length === 0 ? (
                <div className="text-center py-8 select-none">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2.5" />
                  <p className="text-xs text-muted-foreground">No successfully scanned documents found.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-border bg-card/30">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/10 text-muted-foreground font-semibold select-none">
                          <th className="py-2.5 px-3">
                            <button
                              onClick={() => handleSort("displayName")}
                              className="flex items-center gap-1 hover:text-foreground outline-none"
                            >
                              File Title
                              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </button>
                          </th>
                          <th className="py-2.5 px-3">AI Document Type</th>
                          <th className="py-2.5 px-3">Compliance Audits</th>
                          <th className="py-2.5 px-3">Indexed Expiry</th>
                          <th className="py-2.5 px-3 text-right">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/25">
                        {paginatedDocs.map((doc) => {
                          const hasWarning = doc.issueStatus !== null && doc.issueStatus !== undefined && doc.issueStatus !== "";
                          return (
                            <tr
                              key={doc.id}
                              className="hover:bg-secondary/10 cursor-pointer transition-colors"
                              onClick={() => (window.location.href = `/dashboard/vault/${doc.id}`)}
                            >
                              <td className="py-3 px-3 font-bold text-foreground truncate max-w-[150px]">
                                {doc.displayName}
                              </td>
                              <td className="py-3 px-3 text-muted-foreground font-medium select-none capitalize">
                                {doc.fileType.toUpperCase()} Node
                              </td>
                              <td className="py-3 px-3">
                                {hasWarning ? (
                                  <span className="inline-flex items-center gap-1 text-rose-500 font-semibold select-none">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Discrepancy detected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold select-none">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Verified Safe
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-muted-foreground font-medium select-none">
                                {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString() : "No Expiry"}
                              </td>
                              <td className="py-3 px-3 text-right select-none">
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                                  <Sparkles className="h-3 w-3 shrink-0 text-indigo-400" />
                                  94%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredDocs.length > limit && (
                    <div className="flex items-center justify-between border-t border-border/30 pt-3 select-none text-xs">
                      <span className="text-muted-foreground">
                        Showing Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                        <span className="font-semibold text-foreground">{totalPages}</span> (
                        {filteredDocs.length} items)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="p-1.5 rounded-lg border border-border bg-secondary/35 text-muted-foreground hover:text-foreground disabled:opacity-40 hover:bg-secondary transition-all outline-none"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="p-1.5 rounded-lg border border-border bg-secondary/35 text-muted-foreground hover:text-foreground disabled:opacity-40 hover:bg-secondary transition-all outline-none"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
