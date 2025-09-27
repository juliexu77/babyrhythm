import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserRoleSelectorProps {
  value: "owner" | "partner" | "caregiver" | "grandparent";
  onChange: (value: "owner" | "partner" | "caregiver" | "grandparent") => void;
  className?: string;
}

export function UserRoleSelector({ value, onChange, className }: UserRoleSelectorProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl", className)}>
      <Button
        variant={value === "owner" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("owner")}
        className={cn(
          "rounded-lg transition-all text-xs",
          value === "owner" 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
        )}
      >
        Owner
      </Button>
      <Button
        variant={value === "partner" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("partner")}
        className={cn(
          "rounded-lg transition-all text-xs",
          value === "partner" 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
        )}
      >
        Partner
      </Button>
      <Button
        variant={value === "caregiver" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("caregiver")}
        className={cn(
          "rounded-lg transition-all text-xs",
          value === "caregiver" 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
        )}
      >
        Caregiver
      </Button>
      <Button
        variant={value === "grandparent" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("grandparent")}
        className={cn(
          "rounded-lg transition-all text-xs",
          value === "grandparent" 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
        )}
      >
        Grandparent
      </Button>
    </div>
  );
}