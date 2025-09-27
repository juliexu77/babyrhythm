import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserRoleSelectorProps {
  value: "parent" | "caregiver";
  onChange: (value: "parent" | "caregiver") => void;
  className?: string;
}

export function UserRoleSelector({ value, onChange, className }: UserRoleSelectorProps) {
  return (
    <div className={cn("flex gap-1 p-1 bg-muted rounded-xl", className)}>
      <Button
        variant={value === "parent" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("parent")}
        className={cn(
          "flex-1 rounded-lg transition-all",
          value === "parent" 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
        )}
      >
        Parent / Family
      </Button>
      <Button
        variant={value === "caregiver" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("caregiver")}
        className={cn(
          "flex-1 rounded-lg transition-all",
          value === "caregiver" 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background"
        )}
      >
        Caregiver / Nanny
      </Button>
    </div>
  );
}