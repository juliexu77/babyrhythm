import * as React from "react";
import { UserRoleSelector } from "@/components/UserRoleSelector";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "unsaved" | "saving" | "saved" | "error";

interface UserRoleSelectorWithStatusProps {
  value: "parent" | "caregiver";
  onChange: (value: "parent" | "caregiver") => void;
  saveStatus?: SaveStatus;
  errorMessage?: string;
  className?: string;
}

export function UserRoleSelectorWithStatus({ 
  value, 
  onChange, 
  saveStatus = "unsaved", 
  errorMessage,
  className 
}: UserRoleSelectorWithStatusProps) {
  const getStatusIcon = () => {
    switch (saveStatus) {
      case "saving":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "saved":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved";
      case "error":
        return errorMessage || "Failed to save";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <UserRoleSelector 
          value={value} 
          onChange={onChange}
          className={className}
        />
        {getStatusIcon()}
      </div>
      {getStatusText() && (
        <div className={cn(
          "text-xs flex items-center gap-1 transition-all duration-200",
          saveStatus === "saved" && "text-green-600",
          saveStatus === "error" && "text-destructive",
          saveStatus === "saving" && "text-muted-foreground"
        )}>
          <span>{getStatusText()}</span>
        </div>
      )}
    </div>
  );
}