import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg bg-[var(--surface-tertiary)] backdrop-blur-md border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm",
        "placeholder:text-[var(--text-muted)]",
        "focus-visible:outline-none focus-visible:border-[var(--neon-amber)]/60 focus-visible:shadow-[0_0_0_3px_rgba(var(--neon-amber),0.15)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y transition-all duration-200",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
