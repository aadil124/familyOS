"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AIConversation } from "../services/types";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  MessageSquare,
  Search,
  Plus,
  Pin,
  Star,
  Trash2,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "sonner";

interface ConversationSidebarProps {
  conversations: AIConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  isCreating?: boolean;
  isLoading?: boolean;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  isCreating = false,
  isLoading = false,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState("");
  
  // LocalOverrides structure stored in LocalStorage for Pins, Favorites, Renames, and Deletions
  const [pins, setPins] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [renamedTitles, setRenamedTitles] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // Rename modal states
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Sync state with LocalStorage on mount
  useEffect(() => {
    try {
      const savedPins = JSON.parse(localStorage.getItem("chat_pins") || "[]");
      const savedFavs = JSON.parse(localStorage.getItem("chat_favorites") || "[]");
      const savedTitles = JSON.parse(localStorage.getItem("chat_renames") || "{}");
      const savedDeletes = JSON.parse(localStorage.getItem("chat_deletions") || "[]");
      
      setPins(savedPins);
      setFavorites(savedFavs);
      setRenamedTitles(savedTitles);
      setDeletedIds(savedDeletes);
    } catch {
      // Ignore fallback
    }
  }, []);

  // Helpers to persist overrides
  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
    setPins(updated);
    localStorage.setItem("chat_pins", JSON.stringify(updated));
    toast.success(pins.includes(id) ? "Conversation unpinned." : "Conversation pinned to top.");
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("chat_favorites", JSON.stringify(updated));
    toast.success(favorites.includes(id) ? "Removed from favorites." : "Added to favorites.");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...deletedIds, id];
    setDeletedIds(updated);
    localStorage.setItem("chat_deletions", JSON.stringify(updated));
    toast.success("Conversation deleted (simulated locally).");
  };

  const handleOpenRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewTitle(currentTitle);
    setRenameTarget({ id, title: currentTitle });
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !newTitle.trim()) return;
    const updated = { ...renamedTitles, [renameTarget.id]: newTitle.trim() };
    setRenamedTitles(updated);
    localStorage.setItem("chat_renames", JSON.stringify(updated));
    setRenameTarget(null);
    toast.success("Conversation renamed successfully.");
  };

  // Compile local-filtered threads list
  const filteredConversations = useMemo(() => {
    return conversations
      .filter((c) => !deletedIds.includes(c.id))
      .map((c) => ({
        ...c,
        title: renamedTitles[c.id] || c.title,
      }))
      .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  }, [conversations, deletedIds, renamedTitles, search]);

  // Sort: Pinned first, then favorites, then latest updatedAt
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      const pinA = pins.includes(a.id) ? 1 : 0;
      const pinB = pins.includes(b.id) ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      const favA = favorites.includes(a.id) ? 1 : 0;
      const favB = favorites.includes(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredConversations, pins, favorites]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-3 select-none">
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-r border-border bg-card/15 select-none">
      
      {/* Search & New Trigger */}
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search chat sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 rounded-lg border border-border/80 bg-secondary/15 pl-8.5 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
            />
          </div>
          <Button
            onClick={onCreate}
            disabled={isCreating}
            className="h-8 px-2.5 bg-accent hover:bg-accent/80 text-white rounded-lg shrink-0 flex items-center justify-center"
            title="Start new conversation"
          >
            <Plus className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedConversations.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-6">
            No active threads found.
          </p>
        ) : (
          sortedConversations.map((c) => {
            const isActive = activeId === c.id;
            const isPinned = pins.includes(c.id);
            const isFav = favorites.includes(c.id);

            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group flex flex-col p-2.5 rounded-xl cursor-pointer transition-all border text-xs ${
                  isActive
                    ? "bg-accent/10 border-accent/25 text-accent shadow-sm"
                    : "bg-transparent border-transparent hover:bg-secondary/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? "text-accent" : "text-muted-foreground/60 group-hover:text-foreground"}`} />
                    <span className="font-semibold truncate max-w-[140px]">
                      {c.title}
                    </span>
                  </div>
                  
                  {/* Indicators / Quick controls */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => togglePin(c.id, e)}
                      className={`p-0.5 rounded hover:bg-secondary/40 outline-none ${isPinned ? "text-accent opacity-100" : "text-muted-foreground"}`}
                      title={isPinned ? "Unpin thread" : "Pin thread"}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => toggleFavorite(c.id, e)}
                      className={`p-0.5 rounded hover:bg-secondary/40 outline-none ${isFav ? "text-amber-400 opacity-100" : "text-muted-foreground"}`}
                      title={isFav ? "Unfavorite thread" : "Favorite thread"}
                    >
                      <Star className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleOpenRename(c.id, c.title, e)}
                      className="p-0.5 rounded hover:bg-secondary/40 text-muted-foreground outline-none"
                      title="Rename thread"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(c.id, e)}
                      className="p-0.5 rounded hover:bg-secondary/40 text-danger/80 hover:text-danger outline-none"
                      title="Delete thread"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-muted-foreground/75 mt-1 select-none">
                  <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                  <div className="flex gap-1.5 items-center">
                    {isPinned && <Pin className="h-2.5 w-2.5 text-accent shrink-0" />}
                    {isFav && <Star className="h-2.5 w-2.5 text-amber-400 shrink-0" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RENAME THREAD DIALOG */}
      <Dialog
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Rename Conversation"
        className="max-w-sm"
      >
        <form onSubmit={handleSaveRename} className="space-y-4 mt-2">
          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-muted-foreground">
              Thread Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Title
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
