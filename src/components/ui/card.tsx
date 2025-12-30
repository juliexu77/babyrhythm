import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card Component - Strava-Inspired Athletic Aesthetic
 * - Clean, data-forward containers
 * - Sharp-ish corners (12px radius)
 * - Subtle borders, no heavy shadows
 * - Efficient use of space
 */

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      // Shape: Strava-style rounded corners
      "rounded-strava text-card-foreground",
      // Border: Clean, visible border
      "border border-border",
      // Background: Solid, clean
      "bg-card",
      // Transition
      "transition-colors duration-150",
      // Dark mode
      "dark:bg-card dark:border-border/60",
      // Dusk mode
      "dusk:bg-card dusk:border-border/40",
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
    // Strava-style: uppercase, tracking, semibold
    <h3 ref={ref} className={cn("text-xs font-semibold uppercase tracking-caps text-muted-foreground", className)} {...props} />
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
