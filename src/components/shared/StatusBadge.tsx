import { cn } from "@/lib/utils"

export type BadgeVariant = "success" | "error" | "warning" | "neutral" | "info" | "ghost"

interface StatusBadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export default function StatusBadge({ children, variant = "neutral", className }: StatusBadgeProps) {
  const variants = {
    success: "bg-success/15 text-success border-success/20",
    error: "bg-error/15 text-error border-error/20",
    warning: "bg-warning/15 text-warning border-warning/20",
    info: "bg-info/15 text-info border-info/20",
    neutral: "bg-muted text-muted-foreground border-border/50",
    ghost: "bg-transparent text-muted-foreground border-transparent font-normal",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-[6px] py-[2px] rounded-[4px] text-[11px] font-medium border leading-none uppercase",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
