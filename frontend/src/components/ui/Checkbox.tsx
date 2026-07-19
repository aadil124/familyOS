import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, checked, onChange, ...props }, ref) => {
    const fallbackId = React.useId();
    const checkboxId = id || fallbackId;
    const [isChecked, setIsChecked] = React.useState(checked || false);

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsChecked(e.target.checked);
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={checkboxId}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="relative flex items-center justify-center">
            <input
              id={checkboxId}
              type="checkbox"
              ref={ref}
              checked={isChecked}
              onChange={handleToggle}
              className="sr-only"
              {...props}
            />
            {/* Custom styled box */}
            <div
              className={twMerge(
                clsx(
                  "flex h-5 w-5 items-center justify-center rounded border border-border bg-transparent transition-all duration-200",
                  "group-hover:border-ring/50",
                  "group-focus-within:ring-2 group-focus-within:ring-ring group-focus-within:ring-offset-2 group-focus-within:ring-offset-background",
                  {
                    "bg-primary border-primary text-primary-foreground": isChecked,
                    "border-danger/80": !!error,
                  }
                ),
                className
              )}
            >
              {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>
          </div>

          {label && (
            <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-150">
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="text-xs text-danger font-medium pl-7.5 animate-in fade-in duration-200">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
