import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Droplet, Baby, Heart, Activity, ChevronDown, ChevronUp } from "lucide-react";

interface Topic {
  name: string;
  icon: React.ReactNode;
  count: number;
  articles: string[];
}

interface ExploreTopicsSectionProps {
  onTopicClick: (topic: string) => void;
  onArticleClick: (article: string) => void;
}

export const ExploreTopicsSection = ({ onTopicClick, onArticleClick }: ExploreTopicsSectionProps) => {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  
  const topics: Topic[] = [
    {
      name: "Sleep",
      icon: <BookOpen className="w-4 h-4" />,
      count: 12,
      articles: [
        "Sleep regressions explained",
        "Wake windows by age",
        "Nap schedule transitions",
        "Creating bedtime routines",
        "White noise and sleep",
        "Room temperature guide",
        "Sleep training methods",
        "Night waking causes",
        "Early morning wakings"
      ]
    },
    {
      name: "Feeding",
      icon: <Droplet className="w-4 h-4" />,
      count: 8,
      articles: [
        "Bottle feeding best practices",
        "Starting solids guide",
        "Breastfeeding positions",
        "Feeding schedules by age",
        "Paced bottle feeding",
        "When to increase feeds",
        "Reflux and feeding",
        "Cluster feeding explained"
      ]
    },
    {
      name: "Development",
      icon: <Baby className="w-4 h-4" />,
      count: 10,
      articles: [
        "Milestone tracking guide",
        "Tummy time tips",
        "Language development",
        "Motor skill activities",
        "Sensory play ideas",
        "Social development stages",
        "Cognitive growth signs",
        "When to check with doctor"
      ]
    },
    {
      name: "Health",
      icon: <Heart className="w-4 h-4" />,
      count: 7,
      articles: [
        "Common baby illnesses",
        "Temperature taking guide",
        "Diaper rash treatment",
        "Teething symptoms",
        "When to call doctor",
        "Vaccination schedule",
        "Baby first aid basics"
      ]
    },
    {
      name: "Activities",
      icon: <Activity className="w-4 h-4" />,
      count: 6,
      articles: [
        "Age-appropriate play",
        "Outdoor activities",
        "Reading to baby",
        "Music and movement",
        "Baby classes overview",
        "Playtime safety tips"
      ]
    }
  ];

  const toggleTopic = (topicName: string) => {
    setExpandedTopic(expandedTopic === topicName ? null : topicName);
  };

  return (
    <div className="mx-2 space-y-4">
      <h2 className="text-base font-semibold">📚 Explore Topics</h2>
      
      <div className="space-y-3">
        {topics.map((topic) => {
          const isExpanded = expandedTopic === topic.name;
          
          return (
            <Card key={topic.name} className="overflow-hidden border-border/40">
              <button
                onClick={() => toggleTopic(topic.name)}
                className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {topic.icon}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{topic.name}</span>
                      <span className="text-xs text-muted-foreground">({topic.count})</span>
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="pl-[52px] space-y-2">
                    {topic.articles.slice(0, 3).map((article, idx) => (
                      <button
                        key={idx}
                        onClick={() => onArticleClick(article)}
                        className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                      >
                        • {article}
                      </button>
                    ))}
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => onTopicClick(topic.name)}
                    >
                      View all {topic.count} articles →
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
