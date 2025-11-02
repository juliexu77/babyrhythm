import { Button } from "@/components/ui/button";
import { Plus, Moon, Milk, Sun } from "lucide-react";

interface SmartQuickActionsProps {
  suggestions: Array<{
    id: string;
    type: 'nap' | 'feed' | 'wake';
    title: string;
    subtitle: string;
    priority: number;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
  onOpenAddActivity?: () => void;
}

export const SmartQuickActions = ({
  suggestions,
  onOpenAddActivity
}: SmartQuickActionsProps) => {
  const topSuggestions = suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  if (topSuggestions.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAddActivity}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Log something
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
        Suggested Actions
      </h3>
      <div className="space-y-2">
        {topSuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={suggestion.onClick}
            className="w-full p-3 bg-accent/30 hover:bg-accent/50 rounded-lg border border-border transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {suggestion.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-0.5">
                  {suggestion.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {suggestion.subtitle}
                </p>
              </div>
            </div>
          </button>
        ))}
        
        {topSuggestions.length < 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAddActivity}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Log something else
          </Button>
        )}
      </div>
    </div>
  );
};
