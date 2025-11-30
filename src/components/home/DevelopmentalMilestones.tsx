import { useState } from "react";
import { Gem, Sparkles, MessageCircle, Puzzle, Utensils, Moon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface DevelopmentalMilestonesProps {
  babyBirthday?: string;
  babyName?: string;
}

// Placeholder milestone data structure - content to be provided by user
interface MilestoneSet {
  emergingSkills: string[];
  communication: string[];
  playCuriosity: string[];
  feeding?: string[];
  rhythmChanges?: string[];
}

// Will be populated with real content
const getMilestonesForAge = (ageInWeeks: number): MilestoneSet => {
  // Placeholder content - user will provide real milestones by age
  return {
    emergingSkills: [
      "Developing new motor skills typical for this age",
      "Growing stronger each day"
    ],
    communication: [
      "Finding new ways to express themselves",
      "Responding to familiar voices"
    ],
    playCuriosity: [
      "Exploring the world with curiosity",
      "Discovering cause and effect"
    ],
    feeding: [
      "Feeding patterns evolving naturally"
    ],
    rhythmChanges: [
      "Sleep rhythms adjusting as they grow"
    ]
  };
};

const getAgeLabel = (ageInWeeks: number): string => {
  if (ageInWeeks < 4) return `${ageInWeeks} week${ageInWeeks !== 1 ? 's' : ''}`;
  const months = Math.floor(ageInWeeks / 4.33);
  const remainingWeeks = Math.round(ageInWeeks % 4.33);
  if (months < 1) return `${ageInWeeks} weeks`;
  if (remainingWeeks === 0) return `${months} month${months !== 1 ? 's' : ''}`;
  return `${months} month${months !== 1 ? 's' : ''}, ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}`;
};

export const DevelopmentalMilestones = ({ babyBirthday, babyName }: DevelopmentalMilestonesProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate age in weeks
  const getAgeInWeeks = (): number => {
    if (!babyBirthday) return 0;
    const birthDate = new Date(babyBirthday);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  const ageInWeeks = getAgeInWeeks();
  const ageLabel = getAgeLabel(ageInWeeks);
  const milestones = getMilestonesForAge(ageInWeeks);

  if (!babyBirthday) return null;

  return (
    <>
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-primary/10 transition-colors gap-1.5 px-3 py-1"
        onClick={() => setIsOpen(true)}
      >
        <Gem className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium">Developmental Milestones</span>
      </Badge>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="relative pb-2">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle className="text-center font-serif text-lg">
              {ageLabel} — Development Snapshot
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-6 pb-8 space-y-5 overflow-y-auto">
            {/* Emerging Skills */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="font-medium text-sm text-foreground">Emerging Skills</h3>
              </div>
              <ul className="space-y-1.5 pl-6">
                {milestones.emergingSkills.map((skill, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    • {skill}
                  </li>
                ))}
              </ul>
            </div>

            {/* Communication */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-500" />
                <h3 className="font-medium text-sm text-foreground">Communication</h3>
              </div>
              <ul className="space-y-1.5 pl-6">
                {milestones.communication.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Play & Curiosity */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-green-500" />
                <h3 className="font-medium text-sm text-foreground">Play & Curiosity</h3>
              </div>
              <ul className="space-y-1.5 pl-6">
                {milestones.playCuriosity.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feeding (if present) */}
            {milestones.feeding && milestones.feeding.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-orange-500" />
                  <h3 className="font-medium text-sm text-foreground">Feeding</h3>
                </div>
                <ul className="space-y-1.5 pl-6">
                  {milestones.feeding.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rhythm Changes (if present) */}
            {milestones.rhythmChanges && milestones.rhythmChanges.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-medium text-sm text-foreground">Rhythm Changes</h3>
                </div>
                <ul className="space-y-1.5 pl-6">
                  {milestones.rhythmChanges.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reassurance footer */}
            <div className="pt-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground/80 text-center italic leading-relaxed">
                All of these can appear anytime across several weeks — timing varies widely.
              </p>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
