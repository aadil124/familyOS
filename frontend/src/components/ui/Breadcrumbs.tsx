"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className = "" }: BreadcrumbsProps) {
  const pathname = usePathname();
  if (!pathname) return null;

  const pathParts = pathname.split("/").filter((p) => p !== "");

  // Helper to map route segment keys to readable titles
  const getSegmentTitle = (segment: string) => {
    switch (segment) {
      case "dashboard":
        return "Workspace";
      case "family":
        return "Family Members";
      case "vault":
        return "Family Vault";
      case "audits":
        return "Readiness Audits";
      case "chat":
        return "AI Chat Assistant";
      case "alerts":
        return "Notifications";
      case "settings":
        return "Settings";
      default:
        // Capitalize and format ID-like items
        if (segment.length > 20) return "Details";
        return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    }
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-xs text-muted-foreground select-none ${className}`}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors duration-150 outline-none focus:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>

      {pathParts.map((part, index) => {
        const isLast = index === pathParts.length - 1;
        const href = "/" + pathParts.slice(0, index + 1).join("/");
        const title = getSegmentTitle(part);

        // Skip root redirect segment if redundant
        if (part === "dashboard" && index === 0 && pathParts.length > 1) {
          return null;
        }

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/45 shrink-0" />
            {isLast ? (
              <span
                aria-current="page"
                className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-xs"
              >
                {title}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors duration-150 truncate max-w-[100px] sm:max-w-xs outline-none focus:text-foreground"
              >
                {title}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
