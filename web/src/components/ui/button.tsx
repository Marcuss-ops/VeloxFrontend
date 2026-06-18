import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02]",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-white/10 bg-slate-900/60 hover:bg-slate-800 hover:border-white/20 text-slate-200",
        secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700",
        ghost: "hover:bg-white/5 text-slate-300 hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20",
        warning: "bg-amber-600 text-white hover:bg-amber-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-2xl px-8",
        xl: "h-14 rounded-2xl px-10 text-base",
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
