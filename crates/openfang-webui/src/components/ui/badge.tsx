import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--neon-amber)]/50 focus:ring-offset-2 hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-[var(--neon-amber)] to-[var(--neon-amber-dim)] text-[var(--void)] shadow-lg shadow-[var(--neon-amber)]/20",
        secondary:
          "border-transparent bg-[var(--surface-tertiary)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]",
        destructive:
          "border-transparent bg-[var(--neon-magenta)] text-[var(--text-primary)] shadow-lg shadow-[var(--neon-magenta)]/20 hover:bg-[var(--neon-magenta-dim)]",
        outline: "text-[var(--text-primary)] border-[var(--border-default)] bg-[var(--surface-secondary)] backdrop-blur-md",
        glass: "text-[var(--text-primary)] border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl",
        success: "border-transparent bg-[var(--neon-green)]/15 text-[var(--neon-green)] border border-[var(--neon-green)]/30",
        warning: "border-transparent bg-[var(--neon-amber)]/15 text-[var(--neon-amber)] border border-[var(--neon-amber)]/30",
        error: "border-transparent bg-[var(--neon-magenta)]/15 text-[var(--neon-magenta)] border border-[var(--neon-magenta)]/30",
        info: "border-transparent bg-[var(--neon-cyan)]/15 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30",
        amber: "border-transparent bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border border-[var(--neon-amber)]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean
}

function Badge({ className, variant, pulse = false, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), pulse && "animate-pulse", className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
