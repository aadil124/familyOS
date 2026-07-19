import React from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  className?: string;
}

export function Loader({ size = "md", fullScreen = false, className = "" }: LoaderProps) {
  const spinner = (
    <svg
      className={`animate-spin text-accent ${
        size === "sm" ? "h-5 w-5" : size === "md" ? "h-8 w-8" : "h-12 w-12"
      } ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          <span className="text-sm font-medium tracking-wide text-muted-foreground animate-pulse">
            Loading FamilyOS...
          </span>
        </div>
      </div>
    );
  }

  return spinner;
}
