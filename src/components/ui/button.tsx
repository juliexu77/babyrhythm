import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:rounded-sharp dark:transition-all dark:duration-200",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_4px_14px_-3px_hsla(350,40%,35%,0.25)] hover:shadow-[0_6px_20px_-3px_hsla(350,40%,35%,0.35)] hover:translate-y-[-1px] dark:hover:animate-bounce-in",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:hover:animate-bounce-in",
        outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-[0_4px_16px_-4px_hsla(20,35%,50%,0.12)] dark:border-border dark:hover:bg-primary dark:hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_4px_16px_-4px_hsla(345,20%,65%,0.20)] dark:hover:animate-bounce-in",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-primary/20",
        link: "text-primary underline-offset-4 hover:underline",
        cta: "bg-gradient-to-br from-[hsl(350,40%,32%)] to-[hsl(350,45%,24%)] text-white font-semibold shadow-[0_4px_20px_hsla(350,40%,35%,0.25)] hover:shadow-[0_6px_28px_hsla(350,40%,35%,0.35)] hover:translate-y-[-1px] active:translate-y-[0px] active:shadow-[0_2px_12px_hsla(350,40%,35%,0.30)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
