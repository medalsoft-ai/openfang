import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg bg-[var(--surface-tertiary)] backdrop-blur-md border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--text-primary)]",
          "placeholder:text-[var(--text-muted)]",
          "focus-visible:outline-none focus-visible:border-[var(--neon-amber)]/60 focus-visible:shadow-[0_0_0_3px_rgba(var(--neon-amber),0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
