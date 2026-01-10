import { Sparkles } from "lucide-react";
import { useState } from "react";
import { storage, StorageKeys } from "@/hooks/useLocalStorage";

interface TodaysStoryProps {
  onClick: () => void;
}

export function TodaysStory({ onClick }: TodaysStoryProps) {
  const [hasClicked, setHasClicked] = useState(() => {
    return storage.get(StorageKeys.TODAYS_STORY_CLICKED, false);
  });

  const handleClick = () => {
    if (!hasClicked) {
      setHasClicked(true);
      storage.set(StorageKeys.TODAYS_STORY_CLICKED, true);
    }
    onClick();
  };

  return (
    <button 
      onClick={handleClick}
      className="group inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/40 dark:bg-accent/20 hover:bg-accent/60 dark:hover:bg-accent/30 transition-all duration-300 animate-story-breathe"
    >
      <Sparkles className={`w-2.5 h-2.5 text-primary dark:text-primary ${!hasClicked ? 'animate-story-shimmer' : ''}`} />
      <span className="text-[10px] font-medium text-primary dark:text-primary-foreground animate-story-fade-in leading-none">
        Today's Story
      </span>
    </button>
  );
}
