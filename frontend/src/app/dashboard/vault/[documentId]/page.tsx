"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DocumentViewer } from "@/features/dashboard/components/DocumentViewer";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useDocumentQuery,
  useFamilyMembersQuery,
  useDocumentCategoriesQuery,
  useDownloadUrlQuery,
  useDocumentOcrQuery,
  useDocumentAnalysisQuery,
  useUpdateDocumentMetadataMutation,
  useDeleteDocumentMutation,
} from "@/features/dashboard/services/queries";
import {
  ChevronLeft,
  FileText,
  Calendar,
  AlertTriangle,
  Trash2,
  Edit,
  Sparkles,
  Cpu,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ documentId: string }>;
}

export default function DocumentDetailPage({ params }: PageProps) {
  const { documentId } = React.use(params);
  const router = useRouter();
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  // 1. Fetch document and related collections
  const { data: document, isLoading: docLoading, refetch } = useDocumentQuery(familyId, documentId);
  const { data: members = [] } = useFamilyMembersQuery(familyId);
  const { data: categories = [] } = useDocumentCategoriesQuery();

  // Signed URL Query - enable it when document details are ready
  const { data: downloadData } = useDownloadUrlQuery(familyId, documentId, !!document);

  // Poll OCR & AI analysis results
  const { data: ocr, isLoading: ocrLoading } = useDocumentOcrQuery(familyId, documentId);
  const { data: analysis, isLoading: analysisLoading } = useDocumentAnalysisQuery(familyId, documentId);

  // Dialog States
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form Fields
  const [editName, setEditName] = useState("");
  const [editMember, setEditMember] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const updateMetadataMutation = useUpdateDocumentMetadataMutation(familyId, documentId);
  const deleteMutation = useDeleteDocumentMutation(familyId);

  const isDataLoading = docLoading;

  // Mapped Metadata values
  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === document?.categoryId);
  }, [categories, document?.categoryId]);

  const assignedMember = useMemo(() => {
    return members.find((m) => m.id === document?.familyMemberId);
  }, [members, document?.familyMemberId]);

  // Document Expiry Warnings
  const expiryInfo = useMemo(() => {
    if (!document?.expiresAt) return null;
    const now = new Date();
    const exp = new Date(document.expiresAt);
    const diff = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const isExpired = diffDays <= 0;

    return {
      isExpired,
      diffDays: Math.abs(diffDays),
      label: isExpired ? "Expired" : `Expires in ${diffDays} days`,
      color: isExpired ? "text-rose-500 bg-rose-500/10 border-rose-500/20" : "text-amber-500 bg-amber-500/10 border-amber-500/20",
    };
  }, [document?.expiresAt]);

  // Mismatch Analysis Flags: User Assigned vs AI Extracted
  const discrepancies = useMemo(() => {
    if (!document || !analysis || analysis.status !== "SUCCESS") return [];
    const list: string[] = [];

    // Verify Name
    if (analysis.nameOnDocument && document.displayName) {
      const nameMatch = document.displayName.toLowerCase().includes(analysis.nameOnDocument.toLowerCase()) ||
        analysis.nameOnDocument.toLowerCase().includes(document.displayName.toLowerCase());
      if (!nameMatch) {
        list.push(`Title matches "${document.displayName}", but AI detected name on document: "${analysis.nameOnDocument}".`);
      }
    }

    // Verify Expiration Date
    if (analysis.expiryDate && document.expiresAt) {
      const dbDate = new Date(document.expiresAt).toISOString().split("T")[0];
      const aiDate = new Date(analysis.expiryDate).toISOString().split("T")[0];
      if (dbDate !== aiDate) {
        list.push(`Registered expiry date is ${dbDate}, but AI extraction computed: ${aiDate}.`);
      }
    }

    return list;
  }, [document, analysis]);

  // Handlers
  const handleOpenEdit = () => {
    if (!document) return;
    setEditName(document.displayName);
    setEditMember(document.familyMemberId || "");
    setEditCategory(document.categoryId || "");
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMetadataMutation.mutateAsync({
        displayName: editName,
        familyMemberId: editMember || null,
        categoryId: editCategory || null,
      });
      setEditOpen(false);
      toast.success("Document metadata updated.");
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to save edits.");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(documentId);
      setDeleteOpen(false);
      toast.success("Document successfully deleted.");
      router.push("/dashboard/vault");
    } catch {
      toast.error("Failed to delete document.");
    }
  };

  const handleDownload = () => {
    if (downloadData?.downloadUrl) {
      window.open(downloadData.downloadUrl, "_blank");
      toast.success("Download link opened.");
    } else {
      toast.error("Download URL not generated yet.");
    }
  };

  const getFormatIcon = (fileType?: string) => {
    if (!fileType) return <FileText className="h-5 w-5" />;
    const ext = fileType.toLowerCase();
    if (ext === "pdf") return <FileText className="h-5 w-5 text-rose-500" />;
    return <FileText className="h-5 w-5 text-indigo-400" />;
  };

  if (isDataLoading) {
    return (
      <PageContainer>
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-6 w-32" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-[400px] lg:col-span-2 rounded-xl" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!document) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3 animate-bounce" />
          <h2 className="text-lg font-bold text-foreground">Document Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1.5">
            This document node has been deleted or is inaccessible in this workspace scope.
          </p>
          <Button onClick={() => router.push("/dashboard/vault")} className="mt-4" size="sm">
            Back to Vault
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard/vault")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold mb-6 outline-none transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to documents hub
      </button>

      {/* Header section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3.5 rounded-xl border border-border bg-secondary/35 shrink-0 shadow-sm">
            {getFormatIcon(document.fileType)}
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 w-max rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/25">
              {activeCategory?.name || "Unclassified"}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl mt-1.5 truncate max-w-lg">
              {document.displayName}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-sm">
              Original: {document.originalFileName}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            onClick={handleOpenEdit}
            variant="outline"
            className="flex items-center gap-2 border-border/80 text-muted-foreground hover:text-foreground h-9 text-xs"
          >
            <Edit className="h-4 w-4" />
            Edit Metadata
          </Button>
          <Button
            onClick={() => setDeleteOpen(true)}
            variant="ghost"
            className="flex items-center gap-2 text-danger hover:bg-danger/10 h-9 text-xs"
          >
            <Trash2 className="h-4 w-4" />
            Delete Document
          </Button>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8 animate-in fade-in duration-300">
        
        {/* Left Column: Document Viewer canvas */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 select-none">
              <CardTitle className="text-sm font-bold">Attachment Canvas</CardTitle>
              <CardDescription>Preview and edit viewer settings of signed source URL</CardDescription>
            </CardHeader>
            <CardContent>
              {downloadData?.downloadUrl ? (
                <DocumentViewer
                  url={downloadData.downloadUrl}
                  fileType={document.fileType}
                  displayName={document.displayName}
                  onDownload={handleDownload}
                />
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 bg-secondary/10 border border-dashed border-border rounded-xl">
                  <Clock className="h-10 w-10 text-muted-foreground/50 mb-2.5 animate-pulse" />
                  <span className="text-xs font-bold text-muted-foreground">
                    Generating signed preview authorization...
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OCR Result text transcript display */}
          <Card>
            <CardHeader className="pb-3 select-none">
              <div className="flex items-center gap-2">
                <Cpu className="h-4.5 w-4.5 text-accent" />
                <CardTitle className="text-sm font-bold">OCR Transcripts Extraction</CardTitle>
              </div>
              <CardDescription>Raw Text data extracted using optical character models</CardDescription>
            </CardHeader>
            <CardContent>
              {ocrLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : !ocr || ocr.status === "PENDING" || ocr.status === "PROCESSING" ? (
                <div className="flex gap-3 items-start p-3 border border-amber-500/20 bg-amber-500/[0.01] rounded-xl text-amber-500 text-xs select-none animate-pulse">
                  <Clock className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold leading-normal">OCR Extraction in progress</h5>
                    <p className="text-[10px] text-amber-500/80 leading-relaxed mt-0.5">
                      The document text is currently being indexed. Results will populate here automatically.
                    </p>
                  </div>
                </div>
              ) : ocr.status === "FAILED" ? (
                <div className="flex gap-3 items-start p-3 border border-rose-500/20 bg-rose-500/[0.01] rounded-xl text-rose-500 text-xs select-none">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <h5 className="font-bold leading-normal">OCR indexing failed</h5>
                    <p className="text-[10px] text-rose-500/80 leading-relaxed mt-0.5">
                      Reason: {ocr.failureReason || "Format not supported by provider."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 select-none">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      Confidence Index:{" "}
                      <span className="font-bold text-foreground">
                        {ocr.confidenceScore ? `${Math.round(ocr.confidenceScore * 100)}%` : "N/A"}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 uppercase">
                      Provider: {ocr.provider} v{ocr.providerVersion}
                    </span>
                  </div>
                  <div className="border border-border/80 bg-secondary/15 rounded-xl p-3.5 max-h-[250px] overflow-y-auto">
                    <pre className="text-xs font-medium text-foreground/80 font-mono whitespace-pre-wrap leading-relaxed select-all">
                      {ocr.extractedText || "No text could be extracted from this asset."}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI recommendations, discrepancies, and details card */}
        <div className="space-y-6">
          
          {/* Metadata details panel */}
          <Card>
            <CardHeader className="pb-3 select-none">
              <CardTitle className="text-sm font-bold">Document Metadata</CardTitle>
              <CardDescription>Audit parameters and tags</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs select-none">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Assigned Member</span>
                <span className="font-bold text-foreground truncate max-w-[150px]">
                  {assignedMember?.fullName || "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Category Tag</span>
                <span className="font-bold text-foreground">
                  {activeCategory?.name || "Unclassified"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Upload Status</span>
                <span className="font-bold text-foreground capitalize">
                  {document.uploadStatus}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">File Format</span>
                <span className="font-bold text-foreground uppercase">{document.fileType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">File Size</span>
                <span className="font-bold text-foreground">
                  {document.fileSize ? `${((document.fileSize) / 1024).toFixed(0)} KB` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Imported At</span>
                <span className="font-bold text-foreground">
                  {new Date(document.createdAt).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Expiration Details status card */}
          {document.expiresAt && expiryInfo && (
            <Card className={`border ${expiryInfo.color} select-none`}>
              <CardContent className="p-4 flex gap-3.5 items-start">
                <Calendar className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold leading-normal text-foreground">Compliance Expiry Date</h4>
                  <p className="text-sm font-extrabold text-foreground mt-1">
                    {new Date(document.expiresAt).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    {expiryInfo.label}. AI scan monitors this countdown parameter.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights and Discrepancies Alerts */}
          <Card className="border-indigo-500/20 bg-indigo-500/[0.02] shadow-glow relative overflow-hidden select-none">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Sparkles className="h-4 w-4" />
                AI Analysis
              </span>
              {analysis && analysis.status === "SUCCESS" && (
                <span className="text-[9px] text-muted-foreground/60 uppercase">
                  Confidence: {analysis.confidenceScore ? `${Math.round(analysis.confidenceScore * 100)}%` : "N/A"}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {analysisLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3.5 w-5/6" />
                </div>
              ) : !analysis || analysis.status === "PENDING" || analysis.status === "PROCESSING" ? (
                <div className="flex gap-3 items-start p-3 border border-indigo-500/20 bg-indigo-500/[0.01] rounded-xl text-indigo-400 text-xs animate-pulse">
                  <Clock className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold leading-normal">AI Analysis in progress</h5>
                    <p className="text-[10px] text-indigo-400/80 leading-relaxed mt-0.5">
                      AI is scanning the document layout. Discrepancies and insights will compile soon.
                    </p>
                  </div>
                </div>
              ) : analysis.status === "FAILED" ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  AI analysis could not complete for this document format.
                </p>
              ) : (
                <div className="space-y-3.5 text-xs">
                  {/* Summary */}
                  <div className="space-y-1">
                    <h5 className="font-bold text-foreground">Extracted Summary</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {analysis.analysisSummary || "No summary was generated by the AI agent."}
                    </p>
                  </div>

                  {/* Discrepancies Alerts */}
                  {discrepancies.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-indigo-500/10">
                      <h5 className="font-bold text-rose-500 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Discrepancy warnings
                      </h5>
                      <div className="space-y-1.5">
                        {discrepancies.map((dAlert, index) => (
                          <div
                            key={index}
                            className="p-2 border border-rose-500/10 bg-rose-500/[0.02] text-[10px] leading-relaxed text-rose-500 rounded-lg"
                          >
                            {dAlert}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extracted Fields */}
                  <div className="space-y-2 pt-2 border-t border-indigo-500/10">
                    <h5 className="font-bold text-foreground">Extracted Parameters</h5>
                    <div className="space-y-1 bg-secondary/15 p-2.5 rounded-xl text-[11px]">
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">Document Type</span>
                        <span className="font-bold text-foreground">{analysis.detectedDocumentType || "—"}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">Extracted Name</span>
                        <span className="font-bold text-foreground truncate max-w-[130px]">{analysis.nameOnDocument || "—"}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">Extracted Address</span>
                        <span className="font-bold text-foreground truncate max-w-[130px]">{analysis.addressOnDocument || "—"}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">Issued Date</span>
                        <span className="font-bold text-foreground">
                          {analysis.issuedDate ? new Date(analysis.issuedDate).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT METADATA DIALOG */}
      <Dialog
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Document Metadata"
        description="Modify assignment links or rename the document registry node."
      >
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
              onClick={() => setEditOpen(false)}
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
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Document"
        className="max-w-md"
      >
        <div className="space-y-4 mt-2 select-none">
          <div className="flex gap-3.5 items-start p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] text-rose-500 text-sm">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold leading-normal">Irreversible action warning</h4>
              <p className="text-xs text-rose-500/80 leading-relaxed mt-1">
                Deleting the document <strong>&quot;{document.displayName}&quot;</strong> soft-deletes its compliance status, OCR extracted transcripts, and AI risk mappings. You will lose access to the storage attachment reference.
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
              onClick={() => setDeleteOpen(false)}
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
      </Dialog>
    </PageContainer>
  );
}
