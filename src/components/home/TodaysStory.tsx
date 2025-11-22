import { Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

interface TodaysStoryProps {
  onClick: () => void;
}

export function TodaysStory({ onClick }: TodaysStoryProps) {
  const [hasClicked, setHasClicked] = useState(() => {
    return localStorage.getItem('todaysStoryClicked') === 'true';
  });

  const handleClick = () => {
    if (!hasClicked) {
      setHasClicked(true);
      localStorage.setItem('todaysStoryClicked', 'true');
    }
    onClick();
  };

  return (
    <button 
      onClick={handleClick}
      className="group inline-flex items-center gap-0 px-1 py-0 rounded-full bg-[hsl(320_40%_92%)] dark:bg-[hsl(320_40%_25%)] hover:bg-[hsl(320_40%_88%)] dark:hover:bg-[hsl(320_40%_30%)] transition-all duration-300 animate-story-breathe"
    >
      <Sparkles className={`w-2 h-2 text-[hsl(320_45%_55%)] dark:text-[hsl(320_60%_70%)] ${!hasClicked ? 'animate-story-shimmer' : ''}`} />
      <span className="text-[9px] font-medium text-[hsl(320_45%_40%)] dark:text-[hsl(320_60%_85%)] animate-story-fade-in">
        Today's Story
      </span>
    </button>
  );
}
