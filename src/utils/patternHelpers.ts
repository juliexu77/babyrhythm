import { Sun, Moon, TrendingUp, Target, Milk, CloudRain, LucideIcon } from "lucide-react";

// Simple text formatter - uses React's built-in XSS protection
export const formatText = (text: string) => {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, idx) => {
    // Parse bold text **text**
    const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
    
    // Check if this paragraph should be a list
    const isListItem = paragraph.trim().startsWith('- ');
    
    if (isListItem) {
      // Handle list items
      const listItems = paragraph.split('\n').filter(line => line.trim().startsWith('- '));
      return {
        type: 'list' as const,
        items: listItems.map(item => {
          const itemText = item.replace(/^-\s*/, '');
          return itemText.split(/(\*\*[^*]+\*\*)/g).map(part => ({
            isBold: part.startsWith('**') && part.endsWith('**'),
            text: part.startsWith('**') && part.endsWith('**') ? part.slice(2, -2) : part
          }));
        }),
        key: idx,
        isLast: idx >= paragraphs.length - 1
      };
    }
    
    return {
      type: 'paragraph' as const,
      parts: parts.map(part => ({
        isBold: part.startsWith('**') && part.endsWith('**'),
        text: part.startsWith('**') && part.endsWith('**') ? part.slice(2, -2) : part
      })),
      key: idx,
      isLast: idx >= paragraphs.length - 1
    };
  });
};

// Helper to get pattern tooltip
export const getPatternTooltip = (pattern: string): string => {
  switch (pattern) {
    case "Smooth Flow":
      return "Stable naps, predictable feeds, balanced energy.";
    case "Building Rhythm":
      return "Adjusting wake windows or feeding intervals.";
    case "In Sync":
      return "Perfectly aligned with developmental expectations.";
    case "Extra Sleepy":
      return "More rest than usual, often during growth or recovery.";
    case "Active Feeding":
      return "Increased appetite and feeding frequency.";
    case "Off Rhythm":
      return "Recovering from changes like travel, teething, or illness.";
    default:
      return "Unique daily pattern reflecting current needs.";
  }
};

// Helper to get pattern insight descriptions
export const getPatternInsight = (pattern: string): { title: string; description: string } => {
  switch (pattern) {
    case "Smooth Flow":
      return {
        title: "Smooth Flow",
        description: "Stable sleep patterns and consistent appetite throughout the day. This indicates a well-regulated rhythm."
      };
    case "Building Rhythm":
      return {
        title: "Building Rhythm", 
        description: "Experimenting with new wake windows as developmental changes emerge. Patterns are forming but still adjusting."
      };
    case "In Sync":
      return {
        title: "In Sync",
        description: "Perfect alignment with developmental expectations. This harmonious pattern suggests established routines."
      };
    case "Extra Sleepy":
      return {
        title: "Extra Sleepy",
        description: "More sleep than usual, often indicating growth spurts, recovery, or developmental leaps."
      };
    case "Active Feeding":
      return {
        title: "Active Feeding",
        description: "Increased appetite and feeding frequency, common during growth periods or increased activity."
      };
    case "Off Rhythm":
      return {
        title: "Off Rhythm",
        description: "Recovery after schedule changes or environmental shifts. Tomorrow often brings familiar patterns back."
      };
    default:
      return {
        title: pattern,
        description: "Unique daily pattern reflecting your baby's current needs and adjustments."
      };
  }
};

// Get icon component for each pattern
export const getPatternIcon = (pattern: string): LucideIcon => {
  if (pattern === "Smooth Flow") return Sun;
  if (pattern === "Building Rhythm") return TrendingUp;
  if (pattern === "In Sync") return Target;
  if (pattern === "Extra Sleepy") return Moon;
  if (pattern === "Active Feeding") return Milk;
  if (pattern === "Off Rhythm") return CloudRain;
  return TrendingUp;
};

// Get icon color for each pattern
export const getPatternColor = (pattern: string): string => {
  if (pattern === "Smooth Flow") return "text-primary";
  if (pattern === "Building Rhythm") return "text-primary";
  if (pattern === "In Sync") return "text-primary";
  if (pattern === "Extra Sleepy") return "text-muted-foreground";
  if (pattern === "Active Feeding") return "text-primary";
  if (pattern === "Off Rhythm") return "text-muted-foreground";
  return "text-primary";
};
