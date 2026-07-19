"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { StatsCard } from "@/features/dashboard/components/StatsCard";
import { UploadWidget } from "@/features/dashboard/components/UploadWidget";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useDocumentsQuery,
  useFamilyMembersQuery,
  useDocumentCategoriesQuery,
  useDeleteDocumentMutation,
  useUpdateDocumentMetadataMutation,
} from "@/features/dashboard/services/queries";
import { DocumentResponseDto } from "@/features/dashboard/services/types";
import {
  FileText,
  Upload,
  Search,
  LayoutGrid,
  List,
  Eye,
  Check,
  Trash2,
  Edit,
  ArrowUpDown,
  Download,
  AlertTriangle,
  FolderHeart,
  User,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Sparkles,
  FileCheck,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";

export default function DocumentVaultPage() {
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;
  const router = useRouter();

  // 1. Fetch resources
  const { data: documents = [], isLoading: docLoading, refetch } = useDocumentsQuery(familyId);
  const { data: members = [] } = useFamilyMembersQuery(familyId);
  const { data: categories = [] } = useDocumentCategoriesQuery();

  // Dialog / Modal Triggers
  const [activeTab, setActiveTab] = useState<"dashboard" | "registry">("dashboard");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentResponseDto | null>(null);
  const [editTarget, setEditTarget] = useState<DocumentResponseDto | null>(null);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editMember, setEditMember] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Table Registry Configurations
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMember, setFilterMember] = useState("all");
  const [filterProcessing, setFilterProcessing] = useState("all");
  const [layout, setLayout] = useState<"grid" | "table">("table");
  const [sortBy, setSortBy] = useState<"displayName" | "fileSize" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 6;

  // Column Visibility
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    format: true,
    category: true,
    owner: true,
    status: true,
    size: true,
    created: true,
    actions: true,
  });

  // Mutations
  const deleteMutation = useDeleteDocumentMutation(familyId);
  const updateMetadataMutation = useUpdateDocumentMetadataMutation(familyId, editTarget?.id);

  // 2. Computed Overview Stats
  const stats = useMemo(() => {
    const now = new Date();
    const total = documents.length;
    
    let expired = 0;
    let expiringSoon = 0;
    let totalBytes = 0;
    const processingQueue: DocumentResponseDto[] = [];

    documents.forEach((d) => {
      totalBytes += d.fileSize || 0;
      
      if (d.processingStatus === "PENDING" || d.processingStatus === "OCR_PROCESSING" || d.processingStatus === "AI_PROCESSING") {
        processingQueue.push(d);
      }

      if (d.expiresAt) {
        const exp = new Date(d.expiresAt);
        if (exp < now) {
          expired++;
        } else {
          const diff = exp.getTime() - now.getTime();
          const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
          if (diffDays <= 90) {
            expiringSoon++;
          }
        }
      }
    });

    // Format Storage size
    let storageLabel = "0 KB";
    if (totalBytes >= 1024 * 1024) {
      storageLabel = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalBytes >= 1024) {
      storageLabel = `${(totalBytes / 1024).toFixed(0)} KB`;
    }

    return { total, expired, expiringSoon, storageLabel, processingQueue };
  }, [documents]);

  // Recently Uploaded list (take 4)
  const recentUploads = useMemo(() => {
    return [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
  }, [documents]);

  // Expiring files (take 3)
  const expiringList = useMemo(() => {
    const now = new Date();
    return documents
      .filter((d) => d.expiresAt)
      .map((d) => {
        const exp = new Date(d.expiresAt!);
        const diff = exp.getTime() - now.getTime();
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return { doc: d, diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 3);
  }, [documents]);

  // 3. Registry filter/sorting calculations
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((d) => {
        const matchesSearch = d.displayName.toLowerCase().includes(search.toLowerCase()) ||
          d.originalFileName.toLowerCase().includes(search.toLowerCase());
        const matchesCat = filterCategory === "all" || d.categoryId === filterCategory;
        const matchesMem = filterMember === "all" || d.familyMemberId === filterMember;
        const matchesProc = filterProcessing === "all" || d.processingStatus === filterProcessing;
        return matchesSearch && matchesCat && matchesMem && matchesProc;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        valA = valA ?? "";
        valB = valB ?? "";

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        const numA = (valA ?? 0) as number;
        const numB = (valB ?? 0) as number;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      });
  }, [documents, search, filterCategory, filterMember, filterProcessing, sortBy, sortOrder]);

  const paginatedDocs = useMemo(() => {
    const skip = (page - 1) * limit;
    return filteredDocuments.slice(skip, skip + limit);
  }, [filteredDocuments, page]);

  const totalPages = Math.ceil(filteredDocuments.length / limit) || 1;

  const toggleCol = (colKey: keyof typeof visibleCols) => {
    setVisibleCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Actions handlers
  const handleEditClick = (doc: DocumentResponseDto) => {
    setEditTarget(doc);
    setEditName(doc.displayName);
    setEditMember(doc.familyMemberId || "");
    setEditCategory(doc.categoryId || "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      await updateMetadataMutation.mutateAsync({
        displayName: editName,
        familyMemberId: editMember || null,
        categoryId: editCategory || null,
      });
      setEditTarget(null);
      toast.success("Document metadata updated.");
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to update metadata.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Document soft-deleted.");
      refetch();
    } catch {
      toast.error("Failed to delete document.");
    }
  };

  const handleDownload = async (doc: DocumentResponseDto) => {
    try {
      const response = await api.get<{ downloadUrl: string }>(
        `/v1/families/${familyId}/documents/${doc.id}/download`
      );
      // Trigger browser download by opening in a new tab or simulating clicks
      window.open(response.data.downloadUrl, "_blank");
      toast.success("Signed download link generated.");
    } catch {
      toast.error("Failed to generate download URL.");
    }
  };

  const getFormatIcon = (fileType: string) => {
    const ext = fileType.toLowerCase();
    if (ext === "pdf") {
      return <FileText className="h-6 w-6 text-red-500 shrink-0" />;
    }
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
      return <FolderHeart className="h-6 w-6 text-amber-500 shrink-0" />;
    }
    return <FileText className="h-6 w-6 text-indigo-500 shrink-0" />;
  };

  const getProcessingBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 select-none">
            Success
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20 select-none">
            Failed
          </span>
        );
      case "OCR_PROCESSING":
      case "AI_PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20 select-none animate-pulse">
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-500/20 select-none">
            Pending
          </span>
        );
    }
  };

  return (
    <PageContainer>
      {/* Header section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <span className="inline-flex items-center gap-1 w-max rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
            <FileCheck className="h-3.5 w-3.5" />
            Digital Vault
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mt-1.5">
            Documents Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Secure workspace storage for family compliance forms, certificates, and audits.
          </p>
        </div>

        <Button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 h-9 text-xs shrink-0 w-max">
          <Upload className="h-4.5 w-4.5" />
          Upload Document
        </Button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border/60 mb-6 select-none animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 outline-none ${
            activeTab === "dashboard"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Dashboard Overview
        </button>
        <button
          onClick={() => setActiveTab("registry")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 outline-none ${
            activeTab === "registry"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Vault Documents ({documents.length})
        </button>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* stats */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Documents"
              value={stats.total}
              description="Registered items in family vault."
              isLoading={docLoading}
              icon={<FileText className="h-4.5 w-4.5" />}
            />
            <StatsCard
              title="Storage Allocated"
              value={stats.storageLabel}
              description="Directly uploaded file sizes."
              isLoading={docLoading}
              icon={<FolderHeart className="h-4.5 w-4.5 text-emerald-400" />}
            />
            <StatsCard
              title="Expired Files"
              value={stats.expired}
              description="Documents past expiration dates."
              isLoading={docLoading}
              icon={<AlertTriangle className="h-4.5 w-4.5 text-rose-500" />}
              trend={stats.expired > 0 ? { value: "Renewal Required", type: "negative" } : undefined}
            />
            <StatsCard
              title="Expiring Soon"
              value={stats.expiringSoon}
              description="Expirations in next 90 days."
              isLoading={docLoading}
              icon={<Calendar className="h-4.5 w-4.5 text-amber-400" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Recent Uploads Grid */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="select-none pb-3">
                  <CardTitle className="text-base font-bold">Recently Uploaded Files</CardTitle>
                  <CardDescription>Recently added document nodes to the vault</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {docLoading ? (
                    [1, 2].map((i) => <div key={i} className="h-10 bg-secondary/20 rounded-lg animate-pulse" />)
                  ) : recentUploads.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No files uploaded yet.</p>
                  ) : (
                    recentUploads.map((d) => {
                      const category = categories.find((c) => c.id === d.categoryId);
                      return (
                        <div
                          key={d.id}
                          onClick={() => router.push(`/dashboard/vault/${d.id}`)}
                          className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/45 hover:bg-secondary/10 transition-all cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {getFormatIcon(d.fileType)}
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-foreground truncate max-w-[200px]">
                                {d.displayName}
                              </h5>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Category: {category?.name || "Unclassified"}
                              </p>
                            </div>
                          </div>
                          {getProcessingBadge(d.processingStatus)}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* OCR / AI pipeline Queue */}
              <Card>
                <CardHeader className="select-none pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                    <CardTitle className="text-base font-bold">OCR & AI Processing Queue</CardTitle>
                  </div>
                  <CardDescription>File nodes currently traversing backend metadata extraction.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {docLoading ? (
                    <div className="h-10 bg-secondary/20 rounded-lg animate-pulse" />
                  ) : stats.processingQueue.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 border border-emerald-500/20 bg-emerald-500/[0.01] rounded-xl text-emerald-500 text-xs">
                      <FileCheck className="h-4.5 w-4.5 shrink-0" />
                      <span>Pipeline clear: All files processed successfully.</span>
                    </div>
                  ) : (
                    stats.processingQueue.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => router.push(`/dashboard/vault/${d.id}`)}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-secondary/5 hover:bg-secondary/15 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ShieldAlert className="h-5 w-5 text-accent animate-pulse shrink-0" />
                          <span className="text-xs font-semibold truncate text-foreground/80">
                            {d.displayName}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {d.processingStatus.replace("_", " ")}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar details */}
            <div className="space-y-6">
              
              {/* Expiry grid countdown */}
              <Card>
                <CardHeader className="select-none pb-3">
                  <CardTitle className="text-base font-bold">Compliance Expirations</CardTitle>
                  <CardDescription>Vault documents nearing renewal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  {docLoading ? (
                    <div className="h-12 bg-secondary/20 rounded-lg animate-pulse" />
                  ) : expiringList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No expiring files detected.</p>
                  ) : (
                    expiringList.map(({ doc, diffDays }) => {
                      const isExpired = diffDays <= 0;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => router.push(`/dashboard/vault/${doc.id}`)}
                          className={`p-3 rounded-xl border flex gap-3 cursor-pointer select-none ${
                            isExpired
                              ? "border-rose-500/20 bg-rose-500/[0.01] text-rose-500"
                              : "border-amber-500/20 bg-amber-500/[0.01] text-amber-500"
                          }`}
                        >
                          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-foreground truncate">{doc.displayName}</h5>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {isExpired ? "Expired" : `Expires in ${diffDays} days`}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VAULT DOCUMENTS REGISTRY */}
      {activeTab === "registry" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Toolbar controllers */}
          <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
            {/* Search */}
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search file names..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-lg border border-border/80 bg-secondary/15 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 select-none relative text-xs">
              
              {/* Category selector */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/15 px-2.5 py-1.5 text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Category:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-foreground outline-none cursor-pointer font-semibold"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Members selector */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/15 px-2.5 py-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Member:</span>
                <select
                  value={filterMember}
                  onChange={(e) => {
                    setFilterMember(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-foreground outline-none cursor-pointer font-semibold"
                >
                  <option value="all">All Members</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Processing status selector */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/15 px-2.5 py-1.5 text-muted-foreground">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span>AI Status:</span>
                <select
                  value={filterProcessing}
                  onChange={(e) => {
                    setFilterProcessing(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-foreground outline-none cursor-pointer font-semibold"
                >
                  <option value="all">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="OCR_PROCESSING">OCR Processing</option>
                  <option value="AI_PROCESSING">AI Processing</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {/* Layout Switcher */}
              <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
                <button
                  onClick={() => setLayout("table")}
                  className={`p-1.5 transition-all outline-none ${
                    layout === "table" ? "bg-accent text-white" : "bg-secondary/30 text-muted-foreground hover:text-foreground"
                  }`}
                  title="Table layout"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setLayout("grid")}
                  className={`p-1.5 transition-all outline-none ${
                    layout === "grid" ? "bg-accent text-white" : "bg-secondary/30 text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid cards layout"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              {/* Column toggle trigger */}
              <button
                onClick={() => setShowColMenu((prev) => !prev)}
                className="p-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all outline-none shrink-0"
                title="Toggle Columns visibility"
              >
                <Eye className="h-4.5 w-4.5" />
              </button>

              {/* Column toggle checkboxes overlay */}
              {showColMenu && (
                <div className="absolute right-0 top-10 mt-1 z-35 w-48 rounded-xl border border-border bg-card p-1.5 shadow-soft glassmorphism animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase select-none">
                    Visible Columns
                  </div>
                  <div className="my-1 border-t border-border/30" />
                  <div className="space-y-0.5">
                    {Object.entries(visibleCols).map(([key, isVisible]) => (
                      <button
                        key={key}
                        onClick={() => toggleCol(key as keyof typeof visibleCols)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground rounded-lg transition-colors outline-none"
                      >
                        <span className="capitalize">{key}</span>
                        {isVisible && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Empty state registry */}
          {filteredDocuments.length === 0 && (
            <Card className="border-dashed border-border py-12 flex flex-col items-center justify-center text-center select-none bg-card/20 animate-in fade-in duration-300">
              <CardContent className="flex flex-col items-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h4 className="text-sm font-semibold text-foreground">No documents found</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1.5 leading-relaxed">
                  We couldn&apos;t find any files matching your search filters. Try clearing inputs or uploading a new file.
                </p>
              </CardContent>
            </Card>
          )}

          {/* DISPLAY LAYOUT 1: TABLE */}
          {filteredDocuments.length > 0 && layout === "table" && (
            <div className="hidden md:block overflow-x-auto rounded-xl border border-border/80 bg-card/30 animate-in fade-in duration-300">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/10 text-muted-foreground font-semibold select-none text-xs">
                    {visibleCols.format && <th className="py-3 px-4 w-12">Format</th>}
                    <th className="py-3 px-4">
                      <button
                        onClick={() => handleSort("displayName")}
                        className="flex items-center gap-1 hover:text-foreground outline-none"
                      >
                        File Title
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </button>
                    </th>
                    {visibleCols.category && <th className="py-3 px-4 select-none">Category</th>}
                    {visibleCols.owner && <th className="py-3 px-4 select-none">Owner</th>}
                    {visibleCols.status && <th className="py-3 px-4 select-none">OCR Status</th>}
                    {visibleCols.size && (
                      <th className="py-3 px-4">
                        <button
                          onClick={() => handleSort("fileSize")}
                          className="flex items-center gap-1 hover:text-foreground outline-none"
                        >
                          Size
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </button>
                      </th>
                    )}
                    {visibleCols.created && (
                      <th className="py-3 px-4">
                        <button
                          onClick={() => handleSort("createdAt")}
                          className="flex items-center gap-1 hover:text-foreground outline-none"
                        >
                          Created
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </button>
                      </th>
                    )}
                    {visibleCols.actions && <th className="py-3 px-4 text-right select-none">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {paginatedDocs.map((d) => {
                    const cat = categories.find((c) => c.id === d.categoryId);
                    const mem = members.find((m) => m.id === d.familyMemberId);
                    
                    const kb = ((d.fileSize || 0) / 1024).toFixed(0);
                    return (
                      <tr
                        key={d.id}
                        className="group hover:bg-secondary/10 cursor-pointer transition-colors duration-150"
                        onClick={() => router.push(`/dashboard/vault/${d.id}`)}
                      >
                        {visibleCols.format && <td className="py-3.5 px-4">{getFormatIcon(d.fileType)}</td>}
                        <td className="py-3.5 px-4 font-bold text-foreground group-hover:text-accent transition-colors">
                          {d.displayName}
                        </td>
                        {visibleCols.category && (
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {cat?.name || <span className="text-muted-foreground/50">—</span>}
                          </td>
                        )}
                        {visibleCols.owner && (
                          <td className="py-3.5 px-4 text-muted-foreground font-semibold">
                            {mem?.fullName || <span className="text-muted-foreground/50">—</span>}
                          </td>
                        )}
                        {visibleCols.status && <td className="py-3.5 px-4">{getProcessingBadge(d.processingStatus)}</td>}
                        {visibleCols.size && (
                          <td className="py-3.5 px-4 text-muted-foreground font-medium select-none">{kb} KB</td>
                        )}
                        {visibleCols.created && (
                          <td className="py-3.5 px-4 text-muted-foreground font-medium select-none">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </td>
                        )}
                        {visibleCols.actions && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleEditClick(d)}
                                className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
                                title="Edit Metadata"
                              >
                                <Edit className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleDownload(d)}
                                className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
                                title="Download"
                              >
                                <Download className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(d)}
                                className="p-1 rounded-md text-danger hover:bg-danger/10 transition-all outline-none"
                                title="Delete"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* DISPLAY LAYOUT 2: CARDS GRID (Fallback for mobile and grid switcher) */}
          {filteredDocuments.length > 0 && (layout === "grid" || true) && (
            <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${layout === "table" ? "md:hidden" : ""}`}>
              {paginatedDocs.map((d) => {
                const cat = categories.find((c) => c.id === d.categoryId);
                const mem = members.find((m) => m.id === d.familyMemberId);
                const kb = ((d.fileSize || 0) / 1024).toFixed(0);
                return (
                  <Card
                    key={d.id}
                    onClick={() => router.push(`/dashboard/vault/${d.id}`)}
                    className="hover:border-accent/30 active:scale-[0.99] transition-all cursor-pointer bg-card/45 relative overflow-hidden flex flex-col"
                  >
                    <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getFormatIcon(d.fileType)}
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate max-w-[150px]">
                              {d.displayName}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[140px]">
                              {d.originalFileName}
                            </p>
                          </div>
                        </div>
                        {getProcessingBadge(d.processingStatus)}
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 border-t border-border/20 pt-3 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Category</span>
                          <span className="truncate">{cat?.name || "Unclassified"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Owner</span>
                          <span className="truncate">{mem?.fullName || "Unassigned"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">File Size</span>
                          <span>{kb} KB</span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Created</span>
                          <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* actions */}
                      <div
                        className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleEditClick(d)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(d)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(d)}
                          className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-all outline-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          {filteredDocuments.length > limit && (
            <div className="flex items-center justify-between border-t border-border/30 pt-3.5 select-none text-xs">
              <span className="text-muted-foreground">
                Showing Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages}</span> (
                {filteredDocuments.length} items)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border bg-secondary/35 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-all outline-none"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-border bg-secondary/35 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-all outline-none"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* UPLOAD DOCUMENT DIALOG */}
      <Dialog
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Vault Document"
        description="Add a new compliance form, ID, or certificate. Select category and family member references before uploads."
      >
        <div className="mt-2">
          <UploadWidget
            onSuccess={() => {
              setUploadOpen(false);
              refetch();
            }}
            onCancel={() => setUploadOpen(false)}
          />
        </div>
      </Dialog>

      {/* EDIT METADATA DIALOG */}
      <Dialog
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit Document Metadata"
        description="Modify assignment links or rename the document registry node."
      >
        {editTarget && (
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-bold text-muted-foreground select-none">
                File Display Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
              />
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-bold text-muted-foreground select-none">
                Assign to Family Member
              </label>
              <select
                value={editMember}
                onChange={(e) => setEditMember(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none focus:border-ring/30"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-bold text-muted-foreground select-none">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none focus:border-ring/30"
              >
                <option value="">Unclassified</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updateMetadataMutation.isPending}
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={updateMetadataMutation.isPending}
                disabled={updateMetadataMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Document"
        className="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4 mt-2 select-none">
            <div className="flex gap-3.5 items-start p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] text-rose-500 text-sm">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold leading-normal">Irreversible action warning</h4>
                <p className="text-xs text-rose-500/80 leading-relaxed mt-1">
                  Deleting the document <strong>&quot;{deleteTarget.displayName}&quot;</strong> soft-deletes its compliance status, OCR extracted transcripts, and AI risk mappings. You will lose access to the storage attachment reference.
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
