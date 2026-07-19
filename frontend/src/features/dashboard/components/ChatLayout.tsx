"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { AIMessage } from "../services/types";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  User,
  Cpu,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Keyboard,
  History,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";

interface ChatLayoutProps {
  messages: AIMessage[];
  onSend: (text: string) => void;
  isGenerating?: boolean;
}

export function ChatLayout({
  messages,
  onSend,
  isGenerating = false,
}: ChatLayoutProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ratings State overrides stored in localStorage
  const [ratings, setRatings] = useState<Record<string, "like" | "dislike">>({});
  // Recent prompts sent by the user
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);

  // Suggestion Chips
  const suggestionChips = [
    { label: "What documents are missing?", prompt: "What documents are missing from my family vault?" },
    { label: "Show documents expiring soon", prompt: "List all documents expiring in the next 90 days." },
    { label: "Summarize family readiness", prompt: "Explain our current family readiness score and checklist status." },
    { label: "Prepare travel checklist", prompt: "Create a checklist of required documents for international travel." },
  ];

  // Welcome greeting typewriter effect
  const [welcomeText, setWelcomeText] = useState("");
  const fullGreeting = "Hello! I am your FamilyOS AI Assistant. How can I help you manage your family registries today?";

  useEffect(() => {
    if (messages.length > 0) return;
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < fullGreeting.length) {
        setWelcomeText((prev) => prev + fullGreeting.charAt(idx));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Load localStorage variables on mount
  useEffect(() => {
    try {
      const savedRatings = JSON.parse(localStorage.getItem("chat_ratings") || "{}");
      const savedRecents = JSON.parse(localStorage.getItem("chat_recent_prompts") || "[]");
      setRatings(savedRatings);
      setRecentPrompts(savedRecents);
    } catch {
      // Ignore fallback
    }
  }, []);

  // Keyboard Shortcuts: Ctrl + Enter to send, Ctrl + K to focus input
  const handleTriggerSend = useCallback((text: string) => {
    onSend(text);
    setRecentPrompts((prev) => {
      const updated = [text, ...prev.filter((p) => p !== text)].slice(0, 3);
      localStorage.setItem("chat_recent_prompts", JSON.stringify(updated));
      return updated;
    });
  }, [onSend]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (input.trim() && !isGenerating) {
          handleTriggerSend(input.trim());
          setInput("");
        }
      }
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, isGenerating, handleTriggerSend]);

  // Auto Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    handleTriggerSend(input.trim());
    setInput("");
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied message transcript.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (blockId: string, codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(blockId);
    toast.success("Copied code block.");
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleRate = (messageId: string, type: "like" | "dislike") => {
    const updated = { ...ratings, [messageId]: type };
    setRatings(updated);
    localStorage.setItem("chat_ratings", JSON.stringify(updated));
    toast.success("Thank you for your feedback!");
  };

  const clearRecentPrompts = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentPrompts([]);
    localStorage.setItem("chat_recent_prompts", "[]");
    toast.info("Searched prompts history cleared.");
  };

  // Browser-level exporter compiling conversation history to Markdown file
  const handleExport = () => {
    if (messages.length === 0) {
      toast.error("No message history to export.");
      return;
    }

    let md = `# FamilyOS AI Assistant Conversation Export\n`;
    md += `Exported on: ${new Date().toLocaleString()}\n\n---\n\n`;

    messages.forEach((msg) => {
      const roleName = msg.role === "user" ? "User Profile" : "AI Family Secretary";
      md += `### **${roleName}** (${new Date(msg.createdAt).toLocaleTimeString()})\n\n`;
      md += `${msg.content}\n\n`;
      md += `*Safety Status: ${msg.safetyStatus || "unverified"}*\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `familyos_chat_export_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Conversation history exported as Markdown.");
  };

  // Safe markdown and table rendering logic
  const renderMessageContent = (content: string, isLast: boolean) => {
    if (!content) return null;

    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Code Block
      if (part.startsWith("```") && part.endsWith("```")) {
        const langMatch = part.match(/^```(\w+)/);
        const language = langMatch ? langMatch[1] : "code";
        const code = part.replace(/^```\w*\n/, "").slice(0, -3).trim();
        const blockId = `${index}-${language}`;

        return (
          <div key={index} className="my-4 border border-border bg-black/50 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-zinc-950/70 select-none text-[10px] text-muted-foreground font-mono">
              <span>{language.toUpperCase()}</span>
              <button
                onClick={() => handleCopyCode(blockId, code)}
                className="flex items-center gap-1 hover:text-foreground transition-colors outline-none"
              >
                {copiedCodeId === blockId ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[11px] font-mono text-emerald-400 select-text leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Render Tables, Lists, and Typings
      const lines = part.split("\n");
      const tableRows: string[][] = [];
      let isInsideTable = false;

      return (
        <div key={index} className="space-y-2 leading-relaxed select-text text-xs">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();

            // Table parsing
            if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
              isInsideTable = true;
              const cells = trimmed
                .split("|")
                .map((c) => c.trim())
                .filter((c, i, arr) => i > 0 && i < arr.length - 1);
              
              // Skip table dividers (e.g. |---|)
              if (cells.every((c) => c.match(/^-+$/))) {
                return null;
              }

              tableRows.push(cells);

              // If it is the last line or next line is not a table, render the full table
              const nextLine = lines[lIdx + 1]?.trim();
              if (!nextLine || !nextLine.startsWith("|") || !nextLine.endsWith("|")) {
                isInsideTable = false;
                const headers = tableRows[0];
                const dataRows = tableRows.slice(1);
                tableRows.length = 0; // Reset cache

                return (
                  <div key={`table-${lIdx}`} className="my-3 overflow-x-auto rounded-xl border border-border bg-secondary/10">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-border bg-secondary/25 text-muted-foreground font-bold select-none">
                          {headers.map((h, hIdx) => (
                            <th key={hIdx} className="py-2.5 px-3.5">
                              {parseBold(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {dataRows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-secondary/15 transition-colors">
                            {r.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2.5 px-3.5 text-foreground">
                                {parseBold(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return null;
            }

            if (isInsideTable) return null;

            // List item
            if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
              return (
                <li key={lIdx} className="list-disc ml-5 pl-1 my-1">
                  {parseBold(trimmed.slice(2))}
                </li>
              );
            }

            // Normal line
            return (
              <p key={lIdx} className="my-0.5">
                {parseBold(line)}
                {/* Blinking cursor streaming animation */}
                {isLast && isGenerating && lIdx === lines.length - 1 && (
                  <span className="inline-block bg-accent w-1 h-3.5 ml-1 animate-ping shrink-0" />
                )}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Helper bold text parser (**text**)
  const parseBold = (text: string) => {
    const segments = text.split(/(\*\*.*?\*\*)/g);
    return segments.map((seg, idx) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return (
          <strong key={idx} className="font-extrabold text-foreground">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      return seg;
    });
  };

  return (
    <div className="flex flex-col h-full bg-card/5 select-none">
      
      {/* 1. Header Toolbar */}
      <div className="px-6 py-3.5 border-b border-border/60 bg-card/35 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-foreground">AI Secretary active</span>
        </div>
        <button
          onClick={handleExport}
          disabled={messages.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/35 text-[11px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground transition-all outline-none"
          title="Export chat as Markdown"
        >
          <FileDown className="h-3.5 w-3.5 shrink-0" />
          Export Thread
        </button>
      </div>

      {/* 2. Messages Panel */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            /* Premium Glassmorphic Welcome Card */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500/25 blur-xl rounded-full scale-110 animate-pulse" />
                <div className="relative p-4.5 rounded-full border border-indigo-500/30 bg-indigo-950/45 text-indigo-400 shadow-glow">
                  <Sparkles className="h-9 w-9 animate-spin-slow" />
                </div>
              </div>

              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl font-sans">
                FamilyOS AI Assistant
              </h2>
              <div className="h-10 mt-3 max-w-md">
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold italic min-h-[30px]">
                  {welcomeText}
                  <span className="inline-block bg-accent w-1 h-3.5 ml-1 animate-ping" />
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid gap-3 sm:grid-cols-2 w-full mt-6">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTriggerSend(chip.prompt)}
                    className="p-3 text-left border border-border/80 bg-card/35 hover:bg-secondary/15 transition-all rounded-xl text-[11px] leading-relaxed text-muted-foreground hover:text-foreground outline-none font-medium flex flex-col gap-1 shadow-sm hover:border-accent/25 hover:shadow-glow/10"
                  >
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3 text-accent" />
                      {chip.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 truncate w-full">
                      {chip.prompt}
                    </span>
                  </button>
                ))}
              </div>

              {/* Recent Prompts Tags */}
              {recentPrompts.length > 0 && (
                <div className="w-full mt-8 pt-4 border-t border-border/30 text-left">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase select-none mb-3">
                    <span className="flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      Recently Asked
                    </span>
                    <button
                      onClick={clearRecentPrompts}
                      className="hover:text-foreground flex items-center gap-0.5 outline-none"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentPrompts.map((promptText, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleTriggerSend(promptText)}
                        className="px-2.5 py-1 text-[10px] border border-border bg-secondary/20 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 outline-none max-w-[280px] truncate"
                        title={promptText}
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Messages Timeline Bubble */
            <div className="space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const isLast = index === messages.length - 1;
                const activeRating = ratings[msg.id];

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3.5 items-start ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0 select-none shadow-sm">
                        <Cpu className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-lg md:max-w-xl p-3.5 rounded-2xl border text-xs shadow-sm ${
                        isUser
                          ? "bg-accent text-white border-accent/25 rounded-tr-none"
                          : "bg-card/75 text-foreground border-border/80 rounded-tl-none"
                      }`}
                    >
                      {renderMessageContent(msg.content, isLast)}

                      {/* Ratings feedback and copy toolbar */}
                      {!isUser && (
                        <div className="flex items-center justify-between border-t border-border/10 mt-3 pt-2 text-[10px] text-muted-foreground/75 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Confidence Score: 94%</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground outline-none"
                              title="Copy message transcript"
                            >
                              {copiedId === msg.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRate(msg.id, "like")}
                              className={`p-1 rounded hover:bg-secondary outline-none ${activeRating === "like" ? "text-emerald-500" : "text-muted-foreground"}`}
                              title="Helpful response"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleRate(msg.id, "dislike")}
                              className={`p-1 rounded hover:bg-secondary outline-none ${activeRating === "dislike" ? "text-rose-500" : "text-muted-foreground"}`}
                              title="Unhelpful response"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="p-2 rounded-xl border border-border bg-secondary/40 text-muted-foreground shrink-0 select-none shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Bouncing Loader animation */}
              {isGenerating && (
                <div className="flex gap-3.5 items-start justify-start select-none animate-pulse">
                  <div className="p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl border border-border bg-card/75 text-xs text-muted-foreground rounded-tl-none flex flex-col gap-2">
                    <div className="flex gap-1.5 items-center">
                      <span className="h-1.5 w-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 bg-accent rounded-full animate-bounce" />
                    </div>
                    <span className="font-semibold text-[10px] text-muted-foreground/80 leading-normal">
                      AI is indexing context parameters...
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Bottom Prompt Input box */}
      <div className="p-4 border-t border-border/60 bg-card/25 select-none">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              required
              disabled={isGenerating}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI Secretary..."
              className="flex-1 h-10 rounded-xl border border-border bg-secondary/15 px-3.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-ring/30 focus:ring-1 focus:ring-ring/30 disabled:opacity-40"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="h-10 w-10 bg-accent hover:bg-accent/80 text-white rounded-xl flex items-center justify-center shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-between items-center text-[9px] text-muted-foreground/60 font-mono px-1">
            <span className="flex items-center gap-1">
              <Keyboard className="h-3 w-3" />
              Ctrl+Enter to Send
            </span>
            <span>Ctrl+K to Focus</span>
          </div>
        </form>
      </div>

    </div>
  );
}
