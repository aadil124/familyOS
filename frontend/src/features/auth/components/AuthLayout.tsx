"use client";

import React from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { ShieldCheck, Sparkles, BellRing } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background select-none">
      {/* Left Visual Panel - Displayed on Large Screens only */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white lg:flex border-r border-border">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute -left-1/4 -top-1/4 h-[80%] w-[80%] rounded-full bg-indigo-500/20 blur-[120px] animate-pulse-slow" />
          <div className="absolute -right-1/4 -bottom-1/4 h-[80%] w-[80%] rounded-full bg-violet-600/20 blur-[120px] animate-pulse-slow" />
          {/* Subtle grid pattern */}
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
        </div>

        {/* Top Section */}
        <div className="relative z-10">
          <Logo showText={true} textColor="text-white" />
        </div>

        {/* Middle Value Proposition Mockup */}
        <div className="relative z-10 flex flex-col items-start gap-8 max-w-md my-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-3"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" />
              Intelligence Workspace
            </span>
            <h1 className="font-sans text-4xl font-extrabold tracking-tight text-zinc-50 leading-[1.1]">
              Organize and protect your family&apos;s vital assets.
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed mt-1">
              FamilyOS AI automatically parses, categorizes, and audits your legal, financial, and medical documents to verify your readiness for any life event.
            </p>
          </motion.div>

          {/* Features list */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col gap-4 w-full"
          >
            <div className="flex gap-3 items-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Zero-Knowledge Secure Vault</h4>
                <p className="text-xs text-zinc-400">Strict end-to-end cloud protection and metadata-only analysis.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">AI-Powered Readiness Audit</h4>
                <p className="text-xs text-zinc-400">Auto-calculate document gaps and generate personalized checklist audits.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                <BellRing className="h-4.5 w-4.5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Expiry & Mismatch Alerts</h4>
                <p className="text-xs text-zinc-400">Receive warnings for document mismatch names and upcoming expiries.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="relative z-10 text-xs text-zinc-500">
          © {new Date().getFullYear()} FamilyOS. All rights reserved.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex w-full flex-col justify-center items-center px-4 py-12 lg:w-1/2 bg-background">
        <div className="w-full max-w-md">
          {/* Small Logo for mobile/tablet screens */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Logo showText={true} />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
