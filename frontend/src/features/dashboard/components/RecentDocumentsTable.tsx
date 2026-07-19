import React from "react";
import { DocumentResponseDto, FamilyMemberResponseDto } from "@/features/dashboard/services/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { FileText, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface RecentDocumentsTableProps {
  documents: DocumentResponseDto[];
  members: FamilyMemberResponseDto[];
  isLoading?: boolean;
}

export function RecentDocumentsTable({ documents, members, isLoading = false }: RecentDocumentsTableProps) {
  // Helper to map member ID to name
  const getMemberName = (memberId?: string | null) => {
    if (!memberId) return "Workspace Owner";
    const found = members.find((m) => m.id === memberId);
    return found ? found.fullName : "Workspace Owner";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
            <CheckCircle className="h-3 w-3" />
            Verified
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20">
            <AlertTriangle className="h-3 w-3" />
            Failed
          </span>
        );
      case "PENDING":
      case "OCR_PROCESSING":
      case "AI_PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 animate-pulse">
            <Clock className="h-3 w-3" />
            Analyzing...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-500/20">
            {status}
          </span>
        );
    }
  };

  const getExpiryDisplay = (expiryDateStr?: string | null) => {
    if (!expiryDateStr) return <span className="text-muted-foreground/60 select-none">—</span>;

    const expiryDate = new Date(expiryDateStr);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateFormatted = expiryDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-danger font-bold">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Expired ({dateFormatted})
        </span>
      );
    }

    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Expiring in {diffDays}d
        </span>
      );
    }

    return (
      <span className="text-foreground/80 flex items-center gap-1 font-medium">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        {dateFormatted}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 border border-border/40 rounded-lg">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2 py-0.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-card/25 select-none">
        <FileText className="h-10 w-10 text-muted-foreground/45 mb-3" />
        <h4 className="text-sm font-semibold text-foreground">No recent documents</h4>
        <p className="text-xs text-muted-foreground max-w-xs mt-1 leading-relaxed">
          Get started by uploading legal, medical, or financial documents to the vault.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop view: Tabular */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/80 text-muted-foreground font-semibold select-none">
              <th className="pb-3.5 pl-2 font-medium">Document</th>
              <th className="pb-3.5 font-medium">Associated Member</th>
              <th className="pb-3.5 font-medium">Processing Status</th>
              <th className="pb-3.5 font-medium">Expiration Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {documents.map((doc) => (
              <tr key={doc.id} className="group hover:bg-secondary/15 transition-colors duration-150">
                <td className="py-3.5 pl-2 flex items-center gap-3 pr-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border group-hover:border-accent/15 group-hover:bg-zinc-950 transition-colors duration-200">
                    <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate max-w-[200px] lg:max-w-[300px]">
                      {doc.displayName}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate select-none mt-0.5">
                      {doc.category?.name || "Uncategorized"}
                    </p>
                  </div>
                </td>
                <td className="py-3.5 text-foreground/80 font-medium truncate max-w-[140px]">
                  {getMemberName(doc.familyMemberId)}
                </td>
                <td className="py-3.5 select-none">{getStatusBadge(doc.processingStatus)}</td>
                <td className="py-3.5">{getExpiryDisplay(doc.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view: Stacked list */}
      <div className="md:hidden space-y-3.5">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-4 rounded-xl border border-border bg-card/45 flex flex-col gap-3 group active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border text-muted-foreground">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{doc.displayName}</p>
                <p className="text-[10px] text-muted-foreground/60 select-none mt-0.5">
                  {doc.category?.name || "Uncategorized"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-t border-border/20 pt-2.5 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                  Member
                </span>
                <span className="font-semibold text-foreground/80 truncate">
                  {getMemberName(doc.familyMemberId)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                  Status
                </span>
                <span className="select-none">{getStatusBadge(doc.processingStatus)}</span>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2 mt-0.5">
                <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                  Expiration
                </span>
                <span>{getExpiryDisplay(doc.expiresAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
