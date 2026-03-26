import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "surface";
}

export default function Card({ className, variant = "default", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border p-5",
        {
          "bg-card": variant === "default",
          "bg-surface": variant === "surface",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
