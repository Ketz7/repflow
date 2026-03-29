import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error";
  className?: string;
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
        {
          "bg-card text-subtext border-border": variant === "default",
          "bg-primary/10 text-primary border-primary/20": variant === "primary",
          "bg-success/10 text-success border-success/20": variant === "success",
          "bg-warning/10 text-warning border-warning/20": variant === "warning",
          "bg-error/10 text-error border-error/20": variant === "error",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
