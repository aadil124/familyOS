import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowRight } from "lucide-react";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function QuickActionCard({ title, description, icon, href, badge, onClick }: QuickActionCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link href={href} onClick={handleClick} className="group block outline-none">
      <Card className="hover:border-accent/40 hover:bg-zinc-950/20 active:scale-[0.99] transition-all duration-300 relative overflow-hidden select-none">
        {/* Hover Highlight Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <CardContent className="p-5 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 border border-border group-hover:border-accent/20 group-hover:bg-accent/5 text-muted-foreground group-hover:text-accent transition-all duration-300">
            {icon}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors duration-150 truncate">
                {title}
              </h4>
              {badge && (
                <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
              {description}
            </p>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent group-hover:bg-secondary text-muted-foreground group-hover:text-foreground self-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
