import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            // Base styles
            "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
            // Variants
            {
              "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm": variant === "primary",
              "bg-secondary text-secondary-foreground hover:bg-muted": variant === "secondary",
              "border border-border bg-transparent text-foreground hover:bg-secondary": variant === "outline",
              "bg-danger text-danger-foreground hover:opacity-90": variant === "danger",
              "bg-transparent text-foreground hover:bg-secondary": variant === "ghost",
            },
            // Sizes
            {
              "h-8 px-3 text-xs": size === "sm",
              "h-10 px-4 text-sm": size === "md",
              "h-12 px-6 text-base": size === "lg",
            },
            className
          )
        )}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-current"
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
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
