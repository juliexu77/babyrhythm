import { Sparkles } from "lucide-react";

interface TodaysStoryProps {
  onClick: () => void;
}

export function TodaysStory({ onClick }: TodaysStoryProps) {
  return (
    <button 
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(320_40%_92%)] dark:bg-[hsl(320_40%_25%)] hover:bg-[hsl(320_40%_88%)] dark:hover:bg-[hsl(320_40%_30%)] transition-all duration-300 animate-story-breathe"
    >
      <Sparkles className="w-3.5 h-3.5 text-[hsl(320_45%_55%)] dark:text-[hsl(320_60%_70%)] animate-story-shimmer" />
      <span className="text-sm font-medium text-[hsl(320_45%_40%)] dark:text-[hsl(320_60%_85%)] animate-story-fade-in">
        Today's Story
      </span>
    </button>
  );
}
