import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-amber)]/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[var(--neon-amber)] to-[var(--neon-amber-dim)] text-[var(--void)] font-semibold shadow-lg shadow-[var(--neon-amber)]/30 hover:shadow-xl hover:shadow-[var(--neon-amber)]/40 active:scale-[0.98] hover:-translate-y-0.5",
        destructive:
          "bg-[var(--neon-magenta)] text-[var(--void)] shadow-lg shadow-[var(--neon-magenta)]/25 hover:bg-[var(--neon-magenta-dim)] hover:shadow-xl hover:shadow-[var(--neon-magenta)]/30 active:scale-[0.98]",
        outline:
          "bg-[var(--surface-secondary)] backdrop-blur-md border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--neon-amber)]/30 hover:bg-[var(--surface-tertiary)] active:scale-[0.98]",
        secondary:
          "bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--surface-tertiary)] hover:border-[var(--border-hover)] active:scale-[0.98]",
        ghost: "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] active:scale-[0.98]",
        link: "text-[var(--neon-amber)] underline-offset-4 hover:underline hover:text-[var(--neon-amber-dim)]",
        glass:
          "bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-secondary)] shadow-lg active:scale-[0.98]",
        amber:
          "bg-[var(--neon-amber)]/10 border border-[var(--neon-amber)]/30 text-[var(--neon-amber)] hover:bg-[var(--neon-amber)]/20 hover:border-[var(--neon-amber)]/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
