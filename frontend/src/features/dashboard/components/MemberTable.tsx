"use client";

import React, { useState, useMemo } from "react";
import { FamilyMemberResponseDto } from "../services/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Users,
  Trash2,
  Edit,
  ArrowUpDown,
  Search,
  Eye,
  Check,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
} from "lucide-react";

interface MemberTableProps {
  members: FamilyMemberResponseDto[];
  isLoading?: boolean;
  onEdit: (member: FamilyMemberResponseDto) => void;
  onDelete: (member: FamilyMemberResponseDto) => void;
}

export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 60%, 40%)`;
}

export function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

export function calculateAge(dobString?: string | Date | null) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export function MemberTable({ members, isLoading = false, onEdit, onDelete }: MemberTableProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"fullName" | "relationship" | "age" | "primaryEmail">("fullName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterRel, setFilterRel] = useState<string>("all");
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 5;

  // Column Visibility State
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    photo: true,
    relationship: true,
    age: true,
    email: true,
    phone: true,
    status: true,
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

  // 1. Filtering and Search
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        const matchesSearch = m.fullName.toLowerCase().includes(search.toLowerCase()) ||
          (m.primaryEmail?.toLowerCase() || "").includes(search.toLowerCase());
        
        const matchesRel = filterRel === "all" || m.relationship === filterRel;
        return matchesSearch && matchesRel;
      })
      .sort((a, b) => {
        let valA: string | number | null = null;
        let valB: string | number | null = null;

        if (sortBy === "age") {
          valA = calculateAge(a.dateOfBirth) ?? -1;
          valB = calculateAge(b.dateOfBirth) ?? -1;
        } else {
          const key = sortBy as "fullName" | "relationship" | "primaryEmail";
          valA = a[key];
          valB = b[key];
        }

        const strA = (valA ?? "") as string;
        const strB = (valB ?? "") as string;

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc"
            ? strA.localeCompare(strB)
            : strB.localeCompare(strA);
        }

        const numA = (valA ?? 0) as number;
        const numB = (valB ?? 0) as number;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      });
  }, [members, search, sortBy, sortOrder, filterRel]);

  // 2. Pagination
  const paginatedMembers = useMemo(() => {
    const skip = (page - 1) * limit;
    return filteredMembers.slice(skip, skip + limit);
  }, [filteredMembers, page]);

  const totalPages = Math.ceil(filteredMembers.length / limit) || 1;

  const getRelationshipBadge = (rel: string | null) => {
    if (!rel) return <span className="text-muted-foreground select-none">—</span>;
    
    // Custom colors for specific relationships
    switch (rel) {
      case "Spouse":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500 border border-rose-500/20 select-none">
            Spouse
          </span>
        );
      case "Child":
        return (
          <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-500 border border-sky-500/20 select-none">
            Child
          </span>
        );
      case "Guardian":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20 select-none">
            Guardian
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-500/20 select-none">
            {rel}
          </span>
        );
    }
  };

  const getStatusBadge = () => {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 select-none">
        <Check className="h-3 w-3" />
        Active
      </span>
    );
  };

  // Retrieve cached base64 avatars if stored in-memory
  const getAvatarSource = (fullName: string) => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`familyos_avatar_mock_${fullName}`);
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 border border-border/40 rounded-xl bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
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
            placeholder="Search family members..."
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
            <span>Relationship:</span>
            <select
              value={filterRel}
              onChange={(e) => {
                setFilterRel(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-foreground outline-none cursor-pointer font-semibold"
            >
              <option value="all">All Tags</option>
              <option value="Spouse">Spouse</option>
              <option value="Child">Child</option>
              <option value="Sibling">Sibling</option>
              <option value="Grandparent">Grandparent</option>
              <option value="Guardian">Guardian</option>
              <option value="Other">Other</option>
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
                    <span className="capitalize">{key}</span>
                    {isVisible && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <Card className="border-dashed border-border py-12 flex flex-col items-center justify-center text-center select-none bg-card/20">
          <CardContent className="flex flex-col items-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h4 className="text-sm font-semibold text-foreground">No family members found</h4>
            <p className="text-xs text-muted-foreground max-w-xs mt-1.5 leading-relaxed">
              We couldn&apos;t find any members matching your query. Add a new member to your workspace list.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Desktop view: Tabular */}
      {filteredMembers.length > 0 && (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-border/80 bg-card/30 animate-in fade-in duration-300">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/85 bg-secondary/20 text-muted-foreground font-semibold select-none">
                {visibleCols.photo && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider select-none w-16">
                    Photo
                  </th>
                )}
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("fullName")}
                    className="flex items-center gap-1 hover:text-foreground outline-none"
                  >
                    Member Name
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </button>
                </th>
                {visibleCols.relationship && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("relationship")}
                      className="flex items-center gap-1 hover:text-foreground outline-none"
                    >
                      Relationship
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </button>
                  </th>
                )}
                {visibleCols.age && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("age")}
                      className="flex items-center gap-1 hover:text-foreground outline-none"
                    >
                      Age
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </button>
                  </th>
                )}
                {visibleCols.email && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("primaryEmail")}
                      className="flex items-center gap-1 hover:text-foreground outline-none"
                    >
                      Email Address
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </button>
                  </th>
                )}
                {visibleCols.phone && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider select-none">
                    Phone Number
                  </th>
                )}
                {visibleCols.status && (
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider select-none">
                    Status
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
              {paginatedMembers.map((m) => {
                const age = calculateAge(m.dateOfBirth);
                const cachedAvatar = getAvatarSource(m.fullName);
                const color = getAvatarColor(m.fullName);
                return (
                  <tr
                    key={m.id}
                    className="group hover:bg-secondary/10 transition-colors duration-150 cursor-pointer"
                    onClick={() => (window.location.href = `/dashboard/family/${m.id}`)}
                  >
                    {visibleCols.photo && (
                      <td className="py-3 px-4">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-background shadow-sm overflow-hidden select-none shrink-0"
                          style={{
                            backgroundColor: cachedAvatar ? undefined : color,
                          }}
                        >
                          {cachedAvatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={cachedAvatar} alt={m.fullName} className="h-full w-full object-cover" />
                          ) : (
                            getInitials(m.fullName)
                          )}
                        </div>
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-bold text-foreground group-hover:text-accent transition-colors">
                      {m.fullName}
                    </td>
                    {visibleCols.relationship && (
                      <td className="py-3.5 px-4">{getRelationshipBadge(m.relationship)}</td>
                    )}
                    {visibleCols.age && (
                      <td className="py-3.5 px-4 font-medium text-foreground/80 select-none">
                        {age !== null ? `${age} yrs` : <span className="text-muted-foreground/60">—</span>}
                      </td>
                    )}
                    {visibleCols.email && (
                      <td className="py-3.5 px-4 text-muted-foreground select-all font-medium truncate max-w-[200px]">
                        {m.primaryEmail || <span className="text-muted-foreground/60 select-none">—</span>}
                      </td>
                    )}
                    {visibleCols.phone && (
                      <td className="py-3.5 px-4 text-muted-foreground select-all font-medium truncate max-w-[150px]">
                        {m.primaryPhone || <span className="text-muted-foreground/60 select-none">—</span>}
                      </td>
                    )}
                    {visibleCols.status && <td className="py-3.5 px-4">{getStatusBadge()}</td>}
                    {visibleCols.actions && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onEdit(m)}
                            title="Edit Member Profile"
                            className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(m)}
                            title="Delete Member Profile"
                            className="p-1 rounded-md text-danger hover:bg-danger/10 transition-all outline-none"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Mobile view: Stacked Card grid */}
      {filteredMembers.length > 0 && (
        <div className="grid gap-4 md:hidden">
          {paginatedMembers.map((m) => {
            const age = calculateAge(m.dateOfBirth);
            const cachedAvatar = getAvatarSource(m.fullName);
            const color = getAvatarColor(m.fullName);
            return (
              <Card
                key={m.id}
                onClick={() => (window.location.href = `/dashboard/family/${m.id}`)}
                className="hover:border-accent/30 active:scale-[0.99] transition-all cursor-pointer bg-card/45 relative overflow-hidden"
              >
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-center gap-3">
                    {visibleCols.photo && (
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white border border-background shadow-sm overflow-hidden select-none shrink-0"
                        style={{
                          backgroundColor: cachedAvatar ? undefined : color,
                        }}
                      >
                        {cachedAvatar ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={cachedAvatar} alt={m.fullName} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(m.fullName)
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-foreground truncate">{m.fullName}</h4>
                      <p className="text-[10px] text-muted-foreground select-none mt-0.5">
                        Role: Family Member
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onEdit(m)}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(m)}
                        className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-all outline-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 border-t border-border/20 pt-3 text-xs">
                    {visibleCols.relationship && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                          Relationship
                        </span>
                        <span>{getRelationshipBadge(m.relationship)}</span>
                      </div>
                    )}
                    {visibleCols.age && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                          Age
                        </span>
                        <span className="font-semibold text-foreground/80">
                          {age !== null ? `${age} yrs` : <span className="text-muted-foreground/60">—</span>}
                        </span>
                      </div>
                    )}
                    {visibleCols.email && m.primaryEmail && (
                      <div className="flex flex-col gap-0.5 col-span-2 mt-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                          Email Address
                        </span>
                        <span className="font-semibold text-foreground/80 truncate flex items-center gap-1 select-all">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                          {m.primaryEmail}
                        </span>
                      </div>
                    )}
                    {visibleCols.phone && m.primaryPhone && (
                      <div className="flex flex-col gap-0.5 col-span-2 mt-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground/75 uppercase select-none">
                          Phone Number
                        </span>
                        <span className="font-semibold text-foreground/80 truncate flex items-center gap-1 select-all">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                          {m.primaryPhone}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredMembers.length > limit && (
        <div className="flex items-center justify-between border-t border-border/30 pt-3.5 select-none text-xs">
          <span className="text-muted-foreground">
            Showing Page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span> (
            {filteredMembers.length} items)
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
