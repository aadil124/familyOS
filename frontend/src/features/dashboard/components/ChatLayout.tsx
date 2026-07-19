"use client";

import React, { useState, useRef, useEffect } from "react";
import { AIMessage } from "../services/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  Send,
  User,
  Cpu,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

interface ChatLayoutProps {
  messages: AIMessage[];
  onSend: (text: string) => void;
  isGenerating?: boolean;
  isLoading?: boolean;
}

export function ChatLayout({
  messages,
  onSend,
  isGenerating = false,
  isLoading = false,
}: ChatLayoutProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Suggestion Chips
  const suggestionChips = [
    { label: "What documents are missing?", prompt: "What documents are missing from my family vault?" },
    { label: "Show documents expiring soon", prompt: "List all documents expiring in the next 90 days." },
    { label: "Summarize family readiness", prompt: "Explain our current family readiness score and checklist status." },
    { label: "Prepare travel checklist", prompt: "Create a checklist of required documents for international travel." },
  ];

  // Auto Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSend(input.trim());
    setInput("");
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Safe and self-contained simple Markdown/Format renderer
  const renderMessageContent = (content: string) => {
    if (!content) return null;

    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Code Block
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3).replace(/^[a-zA-Z]+\n/, ""); // Remove lang tag if any
        return (
          <pre
            key={index}
            className="my-3 p-3.5 bg-black/40 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto border border-border/30 select-text"
          >
            <code>{code}</code>
          </pre>
        );
      }

      // Checklists, lists, tables, bold styling
      const lines = part.split("\n");
      return (
        <div key={index} className="space-y-1.5 leading-relaxed select-text">
          {lines.map((line, lIdx) => {
            // Check for list item
            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
              return (
                <li key={lIdx} className="list-disc ml-5 pl-1">
                  {parseBold(line.trim().slice(2))}
                </li>
              );
            }
            // Check for table row
            if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
              const cells = line.split("|").map(c => c.trim()).filter(c => c !== "");
              // Skip line divider rows (e.g. |---|)
              if (cells.every(c => c.match(/^-+$/))) return null;
              return (
                <div key={lIdx} className="grid grid-cols-2 gap-3 py-1.5 border-b border-border/10 bg-secondary/5 px-2 rounded-lg text-[11px]">
                  {cells.map((cell, cIdx) => (
                    <span key={cIdx} className={cIdx === 0 ? "font-bold text-muted-foreground" : "text-foreground"}>
                      {parseBold(cell)}
                    </span>
                  ))}
                </div>
              );
            }
            return (
              <p key={lIdx} className="text-xs">
                {parseBold(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Helper parser for bold text (**bold**)
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

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-6 select-none">
        <div className="flex gap-3 items-start max-w-lg">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-20 flex-1 rounded-2xl" />
        </div>
        <div className="flex gap-3 items-start justify-end max-w-lg ml-auto">
          <Skeleton className="h-16 flex-1 rounded-2xl" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card/5">
      
      {/* 1. Messages container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty Chat State with Suggestions Chips */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto select-none animate-in fade-in duration-300">
            <div className="p-4 rounded-full border border-indigo-500/20 bg-indigo-500/[0.02] text-indigo-400 mb-4 shadow-glow">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground">AI Family Assistant</h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Secure digital secretary grounded in your family documents vault, members database, and readiness scores. Ask any question.
            </p>

            <div className="grid gap-2.5 sm:grid-cols-2 w-full mt-8">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSend(chip.prompt)}
                  className="p-3 text-left border border-border bg-card/45 hover:bg-secondary/10 transition-all rounded-xl text-[11px] leading-relaxed text-muted-foreground hover:text-foreground outline-none font-medium flex flex-col gap-1"
                >
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3 text-accent" />
                    {chip.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 truncate w-full">
                    {chip.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Timeline */
          <div className="space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 items-start ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Left Avatar */}
                  {!isUser && (
                    <div className="p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0 select-none shadow-sm">
                      <Cpu className="h-4 w-4" />
                    </div>
                  )}

                  {/* Bubble body */}
                  <div
                    className={`relative group max-w-lg md:max-w-xl p-3.5 rounded-2xl border text-xs shadow-sm ${
                      isUser
                        ? "bg-accent text-white border-accent/25 rounded-tr-none"
                        : "bg-card/75 text-foreground border-border/80 rounded-tl-none"
                    }`}
                  >
                    {renderMessageContent(msg.content)}

                    {/* Floating controls toolbar */}
                    {!isUser && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="p-1 rounded bg-secondary/50 hover:bg-secondary border border-border/40 text-muted-foreground hover:text-foreground outline-none transition-colors"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Avatar */}
                  {isUser && (
                    <div className="p-2 rounded-xl border border-border bg-secondary/40 text-muted-foreground shrink-0 select-none shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Simulated Typing/Generating indicator */}
            {isGenerating && (
              <div className="flex gap-3.5 items-start justify-start select-none animate-pulse">
                <div className="p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="p-3.5 rounded-2xl border border-border bg-card/75 text-xs text-muted-foreground rounded-tl-none flex items-center gap-2">
                  <div className="flex gap-1.5 items-center">
                    <span className="h-1.5 w-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 bg-accent rounded-full animate-bounce" />
                  </div>
                  <span className="font-semibold text-[10px]">AI is indexing context parameters...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* 2. Message submission Form input box */}
      <div className="p-4 border-t border-border/60 bg-card/25 select-none">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            required
            disabled={isGenerating}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a request (e.g. 'Are we missing any passports?')..."
            className="flex-1 h-10 rounded-xl border border-border bg-secondary/15 px-3.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-ring/30 focus:ring-1 focus:ring-ring/30 disabled:opacity-40"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="h-10 w-10 bg-accent hover:bg-accent/80 text-white rounded-xl flex items-center justify-center shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

    </div>
  );
}
