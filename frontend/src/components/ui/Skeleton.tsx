import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rect" | "circle";
}

export function Skeleton({ className, variant = "rect", ...props }: SkeletonProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "animate-pulse bg-muted/60",
          {
            "h-4 w-full rounded": variant === "text",
            "rounded-lg": variant === "rect",
            "rounded-full": variant === "circle",
          }
        ),
        className
      )}
      {...props}
    />
  );
}
