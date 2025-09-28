import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, Loader2, AlertCircle, Circle } from "lucide-react";

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export interface InputWithStatusProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  saveStatus?: SaveStatus;
  errorMessage?: string;
  onValueChange?: (value: string) => void;
}

const InputWithStatus = React.forwardRef<HTMLInputElement, InputWithStatusProps>(
  ({ className, saveStatus = "idle", errorMessage, onValueChange, onChange, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(props.value || "");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange?.(e);
      onValueChange?.(newValue);
    };

    const getStatusIcon = () => {
      switch (saveStatus) {
        case "saving":
          return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
        case "saved":
          return <Check className="h-4 w-4 text-green-500" />;
        case "error":
          return <AlertCircle className="h-4 w-4 text-destructive" />;
        case "unsaved":
          return <Circle className="h-4 w-4 fill-amber-500 text-amber-500" />;
        case "idle":
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
        case "unsaved":
          return "Unsaved changes";
        case "idle":
        default:
          return "";
      }
    };

    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            className={cn(
              "pr-10",
              saveStatus === "error" && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            onChange={handleChange}
            {...props}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getStatusIcon()}
          </div>
        </div>
        {getStatusText() && (
          <div className={cn(
            "text-xs flex items-center gap-1 transition-all duration-200",
            saveStatus === "saved" && "text-green-600",
            saveStatus === "error" && "text-destructive",
            saveStatus === "saving" && "text-muted-foreground",
            saveStatus === "unsaved" && "text-amber-600"
          )}>
            <span>{getStatusText()}</span>
          </div>
        )}
      </div>
    );
  }
);

InputWithStatus.displayName = "InputWithStatus";

export { InputWithStatus };