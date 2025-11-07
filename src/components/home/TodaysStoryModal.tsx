import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity } from "@/components/ActivityCard";
import { format } from "date-fns";
import { Camera, StickyNote, Baby, Moon, Droplet, Ruler, Clock, Check, Share2, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";

interface TodaysStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  babyName?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "feed": return <Baby className="h-4 w-4" />;
    case "diaper": return <Droplet className="h-4 w-4" />;
    case "nap": return <Moon className="h-4 w-4" />;
    case "note": return <StickyNote className="h-4 w-4" />;
    case "measure": return <Ruler className="h-4 w-4" />;
    case "photo": return <Camera className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getActivityLabel = (activity: Activity): string => {
  switch (activity.type) {
    case "feed":
      if (activity.details.feedType === "nursing") {
        return "Nursed";
      } else if (activity.details.feedType === "solid") {
        return "Ate solids";
      } else {
        return `Fed ${activity.details.quantity}${activity.details.unit || "oz"}`;
      }
    case "diaper":
      return `Diaper change (${activity.details.diaperType})`;
    case "nap":
      if (activity.details.isNightSleep) {
        return "Went to bed";
      } else if (activity.details.startTime && activity.details.endTime) {
        return `Napped ${activity.details.startTime} - ${activity.details.endTime}`;
      }
      return "Nap";
    case "measure":
      return "Growth check";
    case "note":
      return "Note";
    case "photo":
      return "Photo";
    default:
      return activity.type;
  }
};

export function TodaysStoryModal({ isOpen, onClose, activities, babyName }: TodaysStoryModalProps) {
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Filter today's activities
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayActivities = activities.filter(activity => {
    if (!activity.loggedAt) return false;
    const activityDate = new Date(activity.loggedAt);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === today.getTime();
  });

  const todayDate = format(today, "MMM d");

  // Get photos with notes
  const photosWithNotes = todayActivities.filter(a => 
    a.type === "photo" && (a.details.photoUrl || a.details.note)
  );

  // Hero moment - most recent photo with note, or most recent photo
  const heroMoment = photosWithNotes[photosWithNotes.length - 1] || 
                     todayActivities.filter(a => a.type === "photo")[0];

  // Get interesting activities (not routine diapers) - limit to 2-3
  const allHighlights = todayActivities.filter(a => 
    a.type === "note" || 
    a.type === "measure" ||
    (a.type === "feed" && a.details.feedType === "solid") ||
    (a.type === "nap" && a.details.isNightSleep)
  );
  const highlights = allHighlights.slice(0, 3); // Only 2-3 highlights

  // Calculate summary stats
  const feedCount = todayActivities.filter(a => a.type === "feed").length;
  const napCount = todayActivities.filter(a => a.type === "nap" && !a.details.isNightSleep).length;
  const diaperCount = todayActivities.filter(a => a.type === "diaper").length;

  // Calculate daily averages for comparison
  const avgFeedsPerDay = 6;
  const avgNapsPerDay = 3;
  const totalNapMinutes = todayActivities
    .filter(a => a.type === "nap" && !a.details.isNightSleep)
    .reduce((sum, a) => {
      if (a.details.startTime && a.details.endTime) {
        const start = new Date(`2000-01-01 ${a.details.startTime}`);
        const end = new Date(`2000-01-01 ${a.details.endTime}`);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60);
      }
      return sum + 90; // Default 90 min if no times
    }, 0);
  const totalSleepHours = (totalNapMinutes / 60).toFixed(1);
  const avgSleepHours = 14;

  // Detect if rhythm is balanced
  const isRhythmBalanced = Math.abs(feedCount - avgFeedsPerDay) <= 1 && 
                           Math.abs(napCount - avgNapsPerDay) <= 1 && 
                           Math.abs(parseFloat(totalSleepHours) - avgSleepHours) <= 1;
  
  // Get baby age from first activity (simplified)
  const getBabyAge = () => {
    // This would ideally come from baby profile
    return 4; // months - placeholder
  };
  
  // Get season
  const getSeason = () => {
    const month = today.getMonth();
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    if (month >= 8 && month <= 10) return "autumn";
    return "winter";
  };
  
  // Detect fatigue indicators
  const hasFatigueIndicators = () => {
    const nightActivities = todayActivities.filter(a => {
      if (!a.loggedAt) return false;
      const hour = new Date(a.loggedAt).getHours();
      return hour >= 0 && hour <= 5;
    });
    return nightActivities.length >= 3; // Multiple night wakings
  };
  
  // Calculate consecutive balanced days (simplified - would need historical data)
  const [consecutiveBalancedDays, setConsecutiveBalancedDays] = useState(0);
  
  // Trigger confetti on balanced rhythm
  useEffect(() => {
    if (isOpen && isRhythmBalanced && !isFavorite) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#A08DC5', '#54AF7D', '#D89B82']
        });
      }, 2000);
    }
  }, [isOpen, isRhythmBalanced]);

  // Detect day tone with theme
  const getDayTone = () => {
    const feedDiff = feedCount - avgFeedsPerDay;
    const napDiff = napCount - avgNapsPerDay;
    const sleepDiff = parseFloat(totalSleepHours) - avgSleepHours;

    if (feedDiff >= 2) return { theme: "feed", color: "hsl(var(--pp-terracotta))" };
    if (napDiff >= 2 || sleepDiff >= 2) return { theme: "sleep", color: "hsl(var(--pp-lavender))" };
    if (allHighlights.some(a => a.details.feedType === "solid")) return { theme: "growth", color: "hsl(var(--pp-mint))" };
    if (isRhythmBalanced) return { theme: "balanced", color: "hsl(var(--accent-1))" };
    return { theme: "calm", color: "hsl(var(--muted-foreground))" };
  };

  const dayTone = getDayTone();

  // Generate Oura-style "Day Summary Signal" - ONE clear emotionally-weighted line
  const getHeadlineSignal = () => {
    const feedDiff = feedCount - avgFeedsPerDay;
    const napDiff = napCount - avgNapsPerDay;
    const sleepDiff = parseFloat(totalSleepHours) - avgSleepHours;

    // Growth day
    if (feedDiff >= 2) {
      return "More feeds than usual — a growth day!";
    }
    
    // Sleep heavy
    if (napDiff >= 2) {
      return "Extra rest today — their body knew what it needed.";
    }
    
    // Slightly off but okay
    if (sleepDiff < -1 && napDiff < 0) {
      return "Slightly shorter naps, but total sleep still on track. You're doing great.";
    }
    
    // New milestone
    if (allHighlights.some(a => a.details.feedType === "solid")) {
      return "New foods explored — another milestone reached naturally.";
    }
    
    // Perfect balance
    if (Math.abs(feedDiff) <= 1 && Math.abs(napDiff) <= 1 && Math.abs(sleepDiff) <= 1) {
      return "A steady rhythm today — well-fed, well-rested, and content.";
    }
    
    // Busy but good
    if (todayActivities.length > 12) {
      return "The rhythm stayed smooth all day. You kept pace beautifully.";
    }
    
    // Default positive
    return "Everything unfolded naturally. You're in sync.";
  };

  // Calculate balance metrics
  const getBalanceMetrics = () => {
    const feedDiff = feedCount - avgFeedsPerDay;
    const napDiff = napCount - avgNapsPerDay;
    const sleepDiff = parseFloat(totalSleepHours) - avgSleepHours;

    return {
      feeds: {
        value: feedCount,
        fillPercent: Math.min((feedCount / 8) * 100, 100),
        comparison: feedDiff > 0 ? `+${feedDiff} above usual` : feedDiff < 0 ? `${feedDiff} below usual` : "steady"
      },
      sleep: {
        value: `${totalSleepHours}h`,
        fillPercent: Math.min((parseFloat(totalSleepHours) / 16) * 100, 100),
        comparison: sleepDiff > 0 ? `+${sleepDiff.toFixed(1)}h vs typical` : sleepDiff < 0 ? `${sleepDiff.toFixed(1)}h vs typical` : "on track"
      },
      awake: {
        value: napCount,
        fillPercent: Math.min((napCount / 5) * 100, 100),
        comparison: napDiff > 0 ? "more active" : napDiff < 0 ? "more rest" : "steady"
      }
    };
  };

  const balanceMetrics = getBalanceMetrics();

  // Generate Stoic-style emotionally human reflection with seasonal/age/fatigue context
  const getReflectionLine = () => {
    const feedDiff = feedCount - avgFeedsPerDay;
    const napDiff = napCount - avgNapsPerDay;
    const season = getSeason();
    const age = getBabyAge();
    const isFatigued = hasFatigueIndicators();
    
    // Fatigue empathy
    if (isFatigued && napDiff >= 1) {
      return "Rough night, but they're catching up on rest — you both needed this recovery day.";
    }
    
    if (isFatigued) {
      return "A challenging night behind you — you showed up anyway. That's the real strength.";
    }
    
    // Seasonal touches
    if (feedDiff >= 2 && season === "winter") {
      return "Growing fast even in the quiet of winter — and you're keeping pace beautifully.";
    }
    
    if (season === "spring" && allHighlights.some(a => a.details.feedType === "solid")) {
      return "First tastes of spring together — new foods, new growth, new season.";
    }
    
    if (season === "autumn") {
      return `First autumn days together — ${babyName || "they're"} changing as fast as the leaves.`;
    }
    
    // Age-based milestones
    if (age === 4 && napCount >= 3) {
      return "At 4 months, these nap patterns are exactly right — you're reading their cues perfectly.";
    }
    
    if (age <= 3 && feedCount >= 7) {
      return "In these early months, frequent feeding is growth — you're giving them everything they need.";
    }
    
    // Original reflections
    if (feedDiff >= 2) {
      return `${babyName || "Your baby"} is growing fast — and you're right in sync.`;
    }
    
    if (napDiff <= -1) {
      return "Today had more wakefulness — exploring the world, taking it all in.";
    }
    
    if (allHighlights.some(a => a.details.feedType === "solid")) {
      return "New foods, new experiences — witnessing growth unfold naturally.";
    }
    
    if (isRhythmBalanced) {
      return "A balanced day — just what both of you needed.";
    }
    
    if (todayActivities.length > 12) {
      return "Full days like this build the foundation — you're doing beautifully.";
    }
    
    return "Steady rhythms, quiet confidence — exactly where you should be.";
  };
  
  // Handle share
  const handleShare = async () => {
    const shareText = `${babyName ? `${babyName}'s Day` : "Today's Story"}\n${getHeadlineSignal()}\n\nFeeds: ${feedCount} | Sleep: ${totalSleepHours}h | Awake periods: ${napCount}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${babyName ? `${babyName}'s Day` : "Today's Story"}`,
          text: shareText
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      // You could show a toast here
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0 gap-0 bg-[hsl(var(--background))]">
        {/* Minimal header with action buttons */}
        <div className="relative px-6 pt-6 pb-2 flex items-center justify-between">
          <DialogHeader>
            <DialogTitle className="text-sm font-light tracking-widest uppercase text-muted-foreground/50">
              {babyName ? `${babyName}'s Day` : "Today's Story"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFavorite(!isFavorite)}
              className="h-8 w-8 p-0"
            >
              <Heart 
                className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} 
                strokeWidth={2}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 w-8 p-0"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] pb-8">
          <div className="space-y-10">
            {/* 1. HERO MOMENT with overlaid headline */}
            {heroMoment && heroMoment.details.photoUrl ? (
              <div 
                className="relative w-full aspect-[4/3] overflow-hidden cursor-pointer group"
                onClick={() => setExpandedPhoto(heroMoment.details.photoUrl || null)}
              >
                <img 
                  src={heroMoment.details.photoUrl} 
                  alt="Today's moment" 
                  className="w-full h-full object-cover animate-story-photo-focus group-hover:scale-105 transition-transform duration-300"
                />
                {/* Soft gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                
                {/* Expand hint on hover */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                {/* Date subtitle */}
                <div className="absolute top-6 left-6">
                  <p className="text-xs font-light text-white/70 uppercase tracking-widest animate-story-text-reveal">
                    Daily rhythm summary — {todayDate}
                  </p>
                </div>
                
                {/* Headline Signal overlaid on photo */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <p className="text-[22px] font-semibold text-white leading-relaxed tracking-tight animate-story-headline-slide drop-shadow-lg">
                    {getHeadlineSignal()}
                  </p>
                  {heroMoment.details.note && (
                    <p className="text-[15px] text-white/70 font-normal tracking-normal drop-shadow-md mt-3 animate-story-text-reveal" style={{ animationDelay: '0.5s' }}>
                      {heroMoment.details.note}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // No photo: headline with date subtitle
              <div className="px-8 pt-4 space-y-2 animate-story-headline-slide">
                <p className="text-xs font-light text-muted-foreground/50 uppercase tracking-widest">
                  Daily rhythm summary — {todayDate}
                </p>
                <p className="text-[22px] font-semibold text-foreground leading-relaxed tracking-tight">
                  {getHeadlineSignal()}
                </p>
              </div>
            )}

            {/* 2. RHYTHM BALANCE INDICATOR with streak */}
            {isRhythmBalanced && (
              <div className="px-8 animate-story-balance-glow" style={{ animationDelay: '0.8s' }}>
                <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/40 flex items-center justify-center bg-primary/10">
                      <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-story-ring-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-foreground tracking-wide uppercase">Rhythm Balanced</span>
                    {consecutiveBalancedDays > 1 && (
                      <span className="text-xs text-muted-foreground font-light">{consecutiveBalancedDays} days in a row</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. OURA-STYLE BALANCE BARS with elevated cards */}
            <div className="px-8 space-y-4 animate-story-stats-enter" style={{ animationDelay: '1s' }}>
              {/* Feeds */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-card/50 to-card/30 backdrop-blur-sm border border-border/20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Baby className="w-4 h-4 text-[hsl(var(--pp-terracotta))]" strokeWidth={2} />
                    <span className="text-[13px] font-semibold text-foreground uppercase tracking-wide">Feeds</span>
                  </div>
                  <span className="text-xs font-normal text-muted-foreground/70 italic">{balanceMetrics.feeds.comparison}</span>
                </div>
                <div className="relative h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 rounded-full animate-story-bar-fill"
                    style={{ 
                      width: `${balanceMetrics.feeds.fillPercent}%`,
                      background: 'linear-gradient(90deg, hsl(var(--pp-terracotta)), hsl(var(--pp-terracotta)) 80%)',
                      animationDelay: '1.1s'
                    }}
                  />
                </div>
              </div>

              {/* Sleep */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-card/50 to-card/30 backdrop-blur-sm border border-border/20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-[hsl(var(--pp-lavender))]" strokeWidth={2} />
                    <span className="text-[13px] font-semibold text-foreground uppercase tracking-wide">Sleep</span>
                  </div>
                  <span className="text-xs font-normal text-muted-foreground/70 italic">{balanceMetrics.sleep.comparison}</span>
                </div>
                <div className="relative h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 rounded-full animate-story-bar-fill"
                    style={{ 
                      width: `${balanceMetrics.sleep.fillPercent}%`,
                      background: 'linear-gradient(90deg, hsl(var(--pp-lavender)), hsl(var(--pp-lavender)) 80%)',
                      animationDelay: '1.2s'
                    }}
                  />
                </div>
              </div>

              {/* Awake periods */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-card/50 to-card/30 backdrop-blur-sm border border-border/20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[hsl(var(--accent-1))]" strokeWidth={2} />
                    <span className="text-[13px] font-semibold text-foreground uppercase tracking-wide">Awake</span>
                  </div>
                  <span className="text-xs font-normal text-muted-foreground/70 italic">{balanceMetrics.awake.comparison}</span>
                </div>
                <div className="relative h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 rounded-full animate-story-bar-fill"
                    style={{ 
                      width: `${balanceMetrics.awake.fillPercent}%`,
                      background: 'linear-gradient(90deg, hsl(var(--accent-1)), hsl(var(--accent-1)) 80%)',
                      animationDelay: '1.3s'
                    }}
                  />
                </div>
              </div>
            </div>


            {/* 4. TODAY'S RHYTHM MOMENTS - Memory tiles */}
            {highlights.length > 0 && (
              <div className="px-8 space-y-4">
                {highlights.map((activity, index) => {
                  const getActivityEmoji = (type: string) => {
                    switch (type) {
                      case "feed": return activity.details.feedType === "solid" ? "solid" : "feed";
                      case "nap": return activity.details.isNightSleep ? "night" : "nap";
                      case "diaper": return "diaper";
                      case "note": return "note";
                      case "measure": return "measure";
                      default: return "default";
                    }
                  };

                  const getActivityIcon = (iconType: string) => {
                    switch (iconType) {
                      case "solid": return <Baby className="w-5 h-5" />;
                      case "feed": return <Baby className="w-5 h-5" />;
                      case "night": return <Moon className="w-5 h-5" />;
                      case "nap": return <Moon className="w-5 h-5" />;
                      case "diaper": return <Droplet className="w-5 h-5" />;
                      case "note": return <StickyNote className="w-5 h-5" />;
                      case "measure": return <Ruler className="w-5 h-5" />;
                      default: return <Clock className="w-5 h-5" />;
                    }
                  };

                  const getMemoryNote = (activity: Activity): string => {
                    if (activity.details.note) return activity.details.note;
                    
                    switch (activity.type) {
                      case "feed":
                        if (activity.details.feedType === "solid") {
                          return "Exploring new tastes and textures beautifully.";
                        }
                        return "Fed well and content.";
                      case "nap":
                        if (activity.details.isNightSleep) {
                          return "Down easily after a full day together.";
                        }
                        return "Rested peacefully when needed.";
                      case "measure":
                        return "Growing strong — another milestone tracked.";
                      case "note":
                        return "A moment worth remembering.";
                      default:
                        return "";
                    }
                  };

                  const iconType = getActivityEmoji(activity.type);
                  
                  return (
                    <div
                      key={activity.id}
                      className="animate-story-card-fade"
                      style={{
                        animationDelay: `${1.5 + index * 0.2}s`
                      }}
                    >
                      <div className="p-5 rounded-xl bg-gradient-to-b from-card/40 to-card/20 backdrop-blur-sm border border-border/20 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-border/40 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5 text-muted-foreground/60">
                            {getActivityIcon(iconType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-light text-muted-foreground/60 uppercase tracking-widest mb-2">
                              {activity.time}
                            </p>
                            <p className="text-[16px] font-normal text-foreground leading-relaxed">
                              {getActivityLabel(activity)}
                            </p>
                            {getMemoryNote(activity) && (
                              <p className="text-[15px] text-muted-foreground/70 mt-2.5 font-light leading-relaxed">
                                {getMemoryNote(activity)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. STOIC REFLECTION - Ceremonial closing with line breaks */}
            <div className="px-8 pt-10 pb-6 animate-story-reflection-fade" style={{ animationDelay: `${2.0 + highlights.length * 0.2}s` }}>
              <div className="relative py-12 overflow-hidden rounded-2xl">
                {/* Day fade to night gradient background */}
                <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-muted/30 to-muted/40 opacity-60 animate-story-dusk-fade" style={{ animationDelay: `${2.0 + highlights.length * 0.2}s` }} />
                
                {/* Split reflection into two lines for ceremonial pacing */}
                <div className="relative space-y-2 text-center">
                  <p className="text-[16px] text-foreground/90 leading-relaxed font-normal tracking-wide">
                    {getReflectionLine().split('—')[0].trim()}
                  </p>
                  {getReflectionLine().includes('—') && (
                    <p className="text-[16px] text-foreground/70 leading-relaxed font-light tracking-wide">
                      {getReflectionLine().split('—')[1]?.trim() || ''}
                    </p>
                  )}
                  
                  {/* Small moon icon for bedtime ritual feel */}
                  <div className="pt-4 flex justify-center">
                    <Moon className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {todayActivities.length === 0 && (
              <div className="text-center py-16 px-8">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl opacity-30">🌙</span>
                </div>
                <p className="text-lg text-muted-foreground/70 font-light leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  No moments captured yet today.
                </p>
                <p className="text-sm text-muted-foreground/50 mt-3 font-light">
                  Start logging to see today's rhythm unfold
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Expanded Photo Modal */}
      {expandedPhoto && (
        <Dialog open={!!expandedPhoto} onOpenChange={() => setExpandedPhoto(null)}>
          <DialogContent className="max-w-4xl p-0 border-0 bg-black/95">
            <div className="relative w-full h-[90vh] flex items-center justify-center">
              <img 
                src={expandedPhoto} 
                alt="Expanded moment" 
                className="max-w-full max-h-full object-contain"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedPhoto(null)}
                className="absolute top-4 right-4 text-white hover:bg-white/20"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
