import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "surface" | "glass";
}

export default function Card({ className, variant = "default", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        {
          "bg-card/80 backdrop-blur-sm border-white/5": variant === "default",
          "bg-surface/80 backdrop-blur-sm border-white/5": variant === "surface",
          "bg-white/5 backdrop-blur-xl border-white/10 shadow-lg": variant === "glass",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
