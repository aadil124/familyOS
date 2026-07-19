"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function OfflinePage() {
  const [isChecking, setIsChecking] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
  }, []);

  const handleRetry = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        window.location.href = "/dashboard";
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md border border-border bg-card/40 p-8 rounded-2xl text-center space-y-6 shadow-md backdrop-blur-sm">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 text-rose-500 animate-bounce">
            <WifiOff className="h-8 w-8" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-foreground">Connection Lost</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            FamilyOS was unable to reach the network. Please verify your internet connection or check router statuses.
          </p>
        </div>

        {isOnline ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-500 text-left">
            <CheckCircleIcon className="h-5 w-5 shrink-0" />
            <div className="space-y-0.5">
              <h5 className="font-extrabold">Network Restored</h5>
              <p className="text-[10px] text-emerald-500/80">Your device is connected. Click below to continue.</p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-secondary/20 border border-border/60 rounded-xl flex items-center gap-2.5 text-xs text-muted-foreground text-left">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-[10px] leading-relaxed">
              We will automatically notify you once connectivity resumes.
            </p>
          </div>
        )}

        <Button
          onClick={handleRetry}
          disabled={isChecking}
          className="w-full bg-accent hover:bg-accent/80 text-white font-bold text-xs"
        >
          {isChecking ? (
            <span className="flex items-center gap-2 justify-center">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Retrying Connection...
            </span>
          ) : (
            "Verify Connection Status"
          )}
        </Button>
      </div>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
