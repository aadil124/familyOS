"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useConversationsQuery,
  useCreateConversationMutation,
  useMessagesQuery,
  useSendMessageMutation,
} from "@/features/dashboard/services/queries";
import { ConversationSidebar } from "@/features/dashboard/components/ConversationSidebar";
import { ChatLayout } from "@/features/dashboard/components/ChatLayout";
import { AIMessage, AIConversation } from "@/features/dashboard/services/types";
import { Menu, X, Cpu } from "lucide-react";
import { toast } from "sonner";

const EMPTY_CONVERSATIONS: AIConversation[] = [];
const EMPTY_MESSAGES: AIMessage[] = [];

export default function ChatPage() {
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  // 1. Fetch conversations in family
  const { data: conversations = EMPTY_CONVERSATIONS, isLoading: listLoading, refetch: refetchConversations } =
    useConversationsQuery(familyId);

  // Mutations
  const createConversationMutation = useCreateConversationMutation(familyId);

  // Active Session state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // 2. Fetch messages for active conversation
  const {
    data: dbMessages = EMPTY_MESSAGES,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useMessagesQuery(familyId, activeConversationId || undefined);

  const sendMessageMutation = useSendMessageMutation(familyId, activeConversationId || undefined);

  // Local message state to support optimistic updates and character typewriter simulation
  const [localMessages, setLocalMessages] = useState<AIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mobile sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-select first thread if available on mount or after list load
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  // Sync local messages state when DB messages update
  useEffect(() => {
    if (dbMessages) {
      setLocalMessages(dbMessages);
    }
  }, [dbMessages]);

  // Create new thread
  const handleCreateThread = async () => {
    try {
      const newConv = await createConversationMutation.mutateAsync({
        title: `Chat Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
      setActiveConversationId(newConv.id);
      setSidebarOpen(false);
      toast.success("New chat session started.");
    } catch {
      toast.error("Failed to start chat session.");
    }
  };

  // Send message flow (with typewriter simulator)
  const executeSendFlow = async (threadId: string, content: string) => {
    // 1. Optimistic insert user message
    const tempUserMsg: AIMessage = {
      id: "temp-user-" + Date.now(),
      conversationId: threadId,
      role: "user",
      content: content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, tempUserMsg]);
    setIsGenerating(true);

    try {
      // 2. Submit post REST request
      const response = await sendMessageMutation.mutateAsync({ content });

      // 3. Setup client typewriter simulation for assistant response
      const words = response.content.split(" ");
      let currentText = "";
      let wordIndex = 0;

      const tempAssistantMsg: AIMessage = {
        id: response.id,
        conversationId: threadId,
        role: "assistant",
        content: "",
        safetyStatus: response.safetyStatus,
        failureReason: response.failureReason,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      };

      setLocalMessages((prev) => [...prev, tempAssistantMsg]);

      const interval = setInterval(() => {
        if (wordIndex < words.length) {
          currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
          setLocalMessages((prev) =>
            prev.map((m) => (m.id === response.id ? { ...m, content: currentText } : m))
          );
          wordIndex++;
        } else {
          clearInterval(interval);
          setIsGenerating(false);
          // Refetch to sync react query state cache
          refetchMessages();
          refetchConversations();
        }
      }, 25); // 25ms interval per word is natural and fast

    } catch {
      toast.error("Failed to compile assistant context reply.");
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversationId) {
      // Auto create a thread if the user prompts immediately
      try {
        const title = text.length > 22 ? text.slice(0, 22) + "..." : text;
        const newConv = await createConversationMutation.mutateAsync({ title });
        setActiveConversationId(newConv.id);
        // Execute message post on new thread ID
        await executeSendFlow(newConv.id, text);
      } catch {
        toast.error("Failed to automatically generate chat session.");
      }
    } else {
      await executeSendFlow(activeConversationId, text);
    }
  };

  return (
    <PageContainer>
      {/* Mobile Header Toggle */}
      <div className="md:hidden flex items-center justify-between border-b border-border bg-card/25 p-3 mb-4 rounded-xl select-none">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground outline-none bg-secondary/35"
        >
          {sidebarOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
        </button>
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Cpu className="h-4 w-4 text-accent" />
          AI Family Assistant
        </span>
        <div className="w-8" /> {/* Spacer */}
      </div>

      <div className="grid md:grid-cols-4 gap-6 h-[calc(100vh-210px)] select-none">
        
        {/* Left Column: Conversations Sidebar (Responsive drawers on mobile) */}
        <div
          className={`md:col-span-1 border border-border rounded-2xl overflow-hidden bg-card/20 shadow-sm transition-all duration-300 md:block ${
            sidebarOpen ? "fixed inset-0 z-50 m-4 block" : "hidden"
          }`}
        >
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3.5 right-3.5 p-1 rounded-lg hover:bg-secondary/40 text-muted-foreground md:hidden z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ConversationSidebar
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={(id) => {
              setActiveConversationId(id);
              setSidebarOpen(false);
            }}
            onCreate={handleCreateThread}
            isCreating={createConversationMutation.isPending}
            isLoading={listLoading}
          />
        </div>

        <div className="md:col-span-3 border border-border rounded-2xl overflow-hidden bg-card/20 flex flex-col shadow-sm">
          {messagesLoading && localMessages.length === 0 ? (
            <div className="flex-1 p-6 space-y-6 select-none bg-card/5">
              <div className="flex gap-3 items-start max-w-lg animate-pulse">
                <div className="h-8 w-8 rounded-full bg-secondary/35 shrink-0" />
                <div className="h-20 flex-1 rounded-2xl bg-secondary/20" />
              </div>
              <div className="flex gap-3 items-start justify-end max-w-lg ml-auto animate-pulse">
                <div className="h-16 flex-1 rounded-2xl bg-secondary/20" />
                <div className="h-8 w-8 rounded-full bg-secondary/35 shrink-0" />
              </div>
            </div>
          ) : (
            <ChatLayout
              messages={localMessages}
              onSend={handleSendMessage}
              isGenerating={isGenerating}
            />
          )}
        </div>

      </div>
    </PageContainer>
  );
}
