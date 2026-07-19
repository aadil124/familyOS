"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FamilyOverview } from "../services/queries";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import {
  FileText,
  Users,
  Calendar,
  Trash2,
  Edit,
  ArrowUpDown,
  Search,
  Eye,
  Check,
  SlidersHorizontal,
  FolderHeart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface FamilyTableProps {
  families: FamilyOverview[];
  isLoading?: boolean;
  onEdit: (family: FamilyOverview) => void;
  onDelete: (family: FamilyOverview) => void;
}

export function FamilyTable({ families, isLoading = false, onEdit, onDelete }: FamilyTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "memberCount" | "documentCount" | "readinessScore" | "createdAt">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterReadiness, setFilterReadiness] = useState<"all" | "high" | "medium" | "low" | "none">("all");
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 5;

  // Column Visibility State
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    head: true,
    members: true,
    documents: true,
    readiness: true,
    status: true,
    created: true,
    actions: true,
  });

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

  // 1. Apply Filtering and Search
  const filteredFamilies = useMemo(() => {
    return families
      .filter((f) => {
        const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
        
        let matchesReadiness = true;
        if (filterReadiness === "high") {
          matchesReadiness = f.readinessScore !== null && f.readinessScore >= 80;
        } else if (filterReadiness === "medium") {
          matchesReadiness = f.readinessScore !== null && f.readinessScore >= 50 && f.readinessScore < 80;
        } else if (filterReadiness === "low") {
          matchesReadiness = f.readinessScore !== null && f.readinessScore < 50;
        } else if (filterReadiness === "none") {
          matchesReadiness = f.readinessScore === null;
        }

        return matchesSearch && matchesReadiness;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === "readinessScore") {
          valA = a.readinessScore ?? -1;
          valB = b.readinessScore ?? -1;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        const numA = (valA ?? 0) as number;
        const numB = (valB ?? 0) as number;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      });
  }, [families, search, sortBy, sortOrder, filterReadiness]);

  // 2. Pagination Calculations
  const paginatedFamilies = useMemo(() => {
    const skip = (page - 1) * limit;
    return filteredFamilies.slice(skip, skip + limit);
  }, [filteredFamilies, page]);

  const totalPages = Math.ceil(filteredFamilies.length / limit) || 1;

  const getReadinessBadge = (score: number | null) => {
    if (score === null) {
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-500/20 select-none">
          Not Audited
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 select-none">
          {score}% Complete
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20 select-none">
          {score}% Average
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20 select-none">
        {score}% Critical
      </span>
    );
  };

  const getStatusBadge = () => {
    // Backend creates with default "active" status
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 select-none">
        <Check className="h-3 w-3" />
        Active
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 border border-border/40 rounded-xl bg-card">
            <Skeleton className="h-10 w-10 rounded-lg" />
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
    <div className="w-full space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search families..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 rounded-lg border border-border/80 bg-secondary/20 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 select-none relative">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/15 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Readiness:</span>
            <select
              value={filterReadiness}
              onChange={(e) => {
                setFilterReadiness(e.target.value as typeof filterReadiness);
                setPage(1);
              }}
              className="bg-transparent text-foreground outline-none cursor-pointer font-semibold"
            >
              <option value="all">All Levels</option>
              <option value="high">High (&ge; 80%)</option>
              <option value="medium">Medium (50%-79%)</option>
              <option value="low">Low (&lt; 50%)</option>
              <option value="none">Not Audited</option>
            </select>
          </div>

          {/* Column Toggle Menu Button */}
          <button
            onClick={() => setShowColMenu((prev) => !prev)}
            title="Toggle column visibility"
            className="p-1.5 rounded-lg border border-border bg-secondary/35 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-150 outline-none"
          >
            <Eye className="h-4.5 w-4.5" />
          </button>

          {/* Visibility Checkbox Selector */}
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
                    <span className="capitalize">{key === "head" ? "Workspace Owner" : key}</span>
                    {isVisible && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredFamilies.length === 0 && (
        <Card className="border-dashed border-border py-12 flex flex-col items-center justify-center text-center select-none bg-card/20">
          <CardContent className="flex flex-col items-center">
            <FolderHeart className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h4 className="text-sm font-semibold text-foreground">No family workspaces found</h4>
            <p className="text-xs text-muted-foreground max-w-xs mt-1.5 leading-relaxed">
              We couldn&apos;t find any family vaults matching your query. Adjust your search or create a new vault scope.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Desktop view: Tabular */}
      {filteredFamilies.length > 0 && (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-border/80 bg-card/30">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/85 bg-secondary/20 text-muted-foreground font-semibold select-none">
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 hover:text-foreground outline-none"
                  >
                    Family Vault Name
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </button>
                </th>
                {visibleCols.head && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider select-none">
                    Owner
                  </th>
                )}
                {visibleCols.members && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("memberCount")}
                      className="flex items-center gap-1 hover:text-foreground outline-none"
                    >
                      Members
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </button>
                  </th>
                )}
                {visibleCols.documents && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("documentCount")}
                      className="flex items-center gap-1 hover:text-foreground outline-none"
                    >
                      Vault Files
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </button>
                  </th>
                )}
                {visibleCols.readiness && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("readinessScore")}
                      className="flex items-center gap-1 hover:text-foreground outline-none"
                    >
                      Readiness Score
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </button>
                  </th>
                )}
                {visibleCols.status && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider select-none">
                    Status
                  </th>
                )}
                {visibleCols.created && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center gap-1 hover:text-foreground outline-none"
                    >
                      Created Date
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </button>
                  </th>
                )}
                {visibleCols.actions && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider select-none text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/25">
              {paginatedFamilies.map((f) => (
                <tr
                  key={f.id}
                  className="group hover:bg-secondary/10 transition-colors duration-150 cursor-pointer"
                  onClick={() => router.push(`/dashboard/families/${f.id}`)}
                >
                  <td className="py-3.5 px-4 font-bold text-foreground group-hover:text-accent transition-colors">
                    {f.name}
                  </td>
                  {visibleCols.head && (
                    <td className="py-3.5 px-4 text-muted-foreground select-none">
                      Workspace Owner
                    </td>
                  )}
                  {visibleCols.members && (
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-foreground/80 font-medium select-none">
                        <Users className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        {f.memberCount}
                      </span>
                    </td>
                  )}
                  {visibleCols.documents && (
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-foreground/80 font-medium select-none">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        {f.documentCount}
                      </span>
                    </td>
                  )}
                  {visibleCols.readiness && (
                    <td className="py-3.5 px-4">{getReadinessBadge(f.readinessScore)}</td>
                  )}
                  {visibleCols.status && <td className="py-3.5 px-4">{getStatusBadge()}</td>}
                  {visibleCols.created && (
                    <td className="py-3.5 px-4 text-muted-foreground select-none">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  )}
                  {visibleCols.actions && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onEdit(f)}
                          title="Rename Vault Scope"
                          className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(f)}
                          title="Delete Vault"
                          className="p-1 rounded-md text-danger hover:bg-danger/10 transition-all outline-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile view: Stacked Card grid */}
      {filteredFamilies.length > 0 && (
        <div className="grid gap-4 md:hidden">
          {paginatedFamilies.map((f) => (
            <Card
              key={f.id}
              onClick={() => router.push(`/dashboard/families/${f.id}`)}
              className="hover:border-accent/30 active:scale-[0.99] transition-all cursor-pointer bg-card/45 relative overflow-hidden"
            >
              <CardContent className="p-4 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate">{f.name}</h4>
                    <p className="text-[10px] text-muted-foreground select-none mt-0.5">
                      Scope: Workspace Owner
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit(f)}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(f)}
                      className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-all outline-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 border-t border-border/20 pt-3 text-xs">
                  {visibleCols.members && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                        Members
                      </span>
                      <span className="font-semibold text-foreground/80 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
                        {f.memberCount}
                      </span>
                    </div>
                  )}
                  {visibleCols.documents && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                        Vault Files
                      </span>
                      <span className="font-semibold text-foreground/80 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
                        {f.documentCount}
                      </span>
                    </div>
                  )}
                  {visibleCols.readiness && (
                    <div className="flex flex-col gap-0.5 col-span-2 mt-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                        Readiness score
                      </span>
                      <span>{getReadinessBadge(f.readinessScore)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Footer Toolbar */}
      {filteredFamilies.length > limit && (
        <div className="flex items-center justify-between border-t border-border/30 pt-3.5 select-none text-xs">
          <span className="text-muted-foreground">
            Showing Page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span> (
            {filteredFamilies.length} items)
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
  );
}
