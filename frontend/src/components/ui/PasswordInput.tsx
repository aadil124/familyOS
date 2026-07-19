import React, { useState } from "react";
import { Input, InputProps } from "./Input";
import { Eye, EyeOff, Lock } from "lucide-react";

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type" | "icon">>(
  ({ label, error, helperText, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          label={label}
          error={error}
          helperText={helperText}
          className={className}
          icon={<Lock className="h-4 w-4" />}
          {...props}
        />
        {/* Toggle Button */}
        <button
          type="button"
          tabIndex={-1}
          onClick={toggleVisibility}
          className="absolute right-3 top-[32px] flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground outline-none"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
