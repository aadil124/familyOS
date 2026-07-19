import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, icon, id, disabled, ...props }, ref) => {
    const fallbackId = React.useId();
    const inputId = id || fallbackId;
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-muted-foreground select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-muted-foreground pointer-events-none select-none">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            className={twMerge(
              clsx(
                // Base input styles
                "flex h-10 w-full rounded-lg border border-border bg-transparent px-3.5 py-2 text-sm text-foreground transition-all duration-200 outline-none",
                "placeholder:text-muted-foreground/60",
                "focus:border-ring/40 focus:ring-1 focus:ring-ring/40",
                "disabled:cursor-not-allowed disabled:opacity-50",
                // Conditional icon space
                {
                  "pl-10": !!icon,
                  "border-danger/80 focus:border-danger focus:ring-danger/20": !!error,
                }
              ),
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-danger font-medium animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
