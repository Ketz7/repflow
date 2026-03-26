"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-subtext/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-colors text-sm",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export default Input;
