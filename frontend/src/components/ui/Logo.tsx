import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
}

export function Logo({ className = "", showText = true, textColor = "text-foreground" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Abstract geometric icon (overlapping houses/vault) */}
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background shadow-md transition-transform duration-300 hover:scale-105">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5.5 w-5.5"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
        <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
      </div>
      
      {showText && (
        <span className={`font-sans text-xl font-bold tracking-tight ${textColor}`}>
          Family<span className="text-accent">OS</span>
        </span>
      )}
    </div>
  );
}
