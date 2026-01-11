import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card Component - Clean, Modern Aesthetic
 * - Sharp shadows for depth/separation
 * - Clean sans-serif throughout
 * - Data-forward containers
 */

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      // Shape: Modern rounded corners
      "rounded-xl text-card-foreground",
      // Border: Clean, subtle border
      "border border-border/50",
      // Background: Solid, clean
      "bg-card",
      // Shadow: Sharp for depth/separation
      "shadow-sharp",
      // Transition
      "transition-all duration-150",
      // Dark mode
      "dark:bg-card dark:border-border/40 dark:shadow-none",
      // Dusk mode
      "dusk:bg-card dusk:border-border/30 dusk:shadow-none",
      className
    )} 
    {...props} 
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    // Strava-style: clean padding, optional border for separation
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-4 pb-3", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // Clean sans-serif, semibold
    <h3 ref={ref} className={cn("text-sm font-semibold tracking-tight text-foreground", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-4 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
