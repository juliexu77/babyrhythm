import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Moon } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface NightDoulaReviewProps {
  activities: Activity[];
  babyName?: string;
}

interface NapClassification {
  type: 'all-short' | 'all-long' | 'mix' | 'single-short' | 'single-long';
  description: string;
}

interface DayStats {
  feeds: number;
  volume: number;
  unit: string;
  naps: number;
  napDuration: number;
  bedtime: string | null;
  notes: Activity[];
  photos: string[];
}

// Age norms in months
const AGE_NORMS = {
  '0-2': { feeds: [8, 12], naps: [4, 6] },
  '3-4': { feeds: [6, 10], naps: [4, 5] },
  '5-6': { feeds: [5, 8], naps: [3, 4] },
  '7-9': { feeds: [4, 7], naps: [2, 3] },
  '10-12': { feeds: [3, 6], naps: [2, 3] },
  '12+': { feeds: [3, 5], naps: [1, 2] }
};

// Natural language bank for warm, conversational tone
const LANGUAGE_BANK = {
  feeds: [
    "{baby_name} had {feed_count} feeds today, around {feed_total_ml} ml altogether.",
    "{baby_name} finished {feed_count} feeds today for about {feed_total_ml} ml total.",
    "Today's tally: {feed_count} feeds, adding up to roughly {feed_total_ml} ml.",
    "{baby_name} got in {feed_count} feeds, totaling about {feed_total_ml} ml."
  ],
  naps: {
    'all-short': [
      "He had a couple of quick catnaps today.",
      "All shorter stretches, closer to 30 minutes each.",
      "Everything was on the briefer side today."
    ],
    'all-long': [
      "He took solid stretches today, each well over an hour.",
      "All longer naps today — great hour-plus stretches that gave him real rest.",
      "Every nap was a strong one, lasting over an hour."
    ],
    'mix': [
      "He balanced one long nap with a few shorter catnaps.",
      "A mix today — one good anchor nap plus a couple of quicker ones.",
      "Variety today: one solid stretch with some shorter ones around it."
    ],
    'single-short': [
      "He managed one shorter catnap today.",
      "Just one brief stretch, around {duration} minutes.",
      "One quick nap today, about {duration} minutes."
    ],
    'single-long': [
      "He took one solid stretch today, over an hour.",
      "One great long nap anchoring the day.",
      "A strong hour-plus nap that gave him some real rest."
    ]
  },
  bedtime: [
    "Bedtime was {bedtime}.",
    "He settled down at {bedtime}.",
    "Down for the night by {bedtime}.",
    "Ready for sleep around {bedtime}."
  ],
  notes: [
    "Since you mentioned {note_reference}, that makes sense with how his day went.",
    "You noted {note_reference}, which could explain {note_related_effect}.",
    "With {note_reference} happening today, it's no surprise {note_related_effect}.",
    "Because {note_reference}, his rhythm may have shifted a little.",
    "I noticed you logged {note_reference} — that often explains {note_related_effect}."
  ],
  comparison: {
    volume_more: [
      "just a touch more than yesterday",
      "slightly more than yesterday, showing he's fueling up",
      "a little extra compared to yesterday"
    ],
    volume_less: [
      "a little less than yesterday — basically steady",
      "just a touch less than yesterday",
      "slightly less than yesterday but still consistent"
    ],
    volume_same: [
      "right in line with what he usually takes",
      "about the same as yesterday — nice and consistent",
      "steady with yesterday's amount"
    ],
    naps_more: "and got a bit more daytime sleep",
    naps_less: "with shorter naps overall",
    growth_spurt: [
      ", which often means he's gearing up for a growth spurt.",
      " — classic signs of fueling up for growth.",
      ", showing he's likely hitting a growth phase."
    ]
  },
  peer: [
    "Most {age_months}-month-olds do something similar, so he's right on track.",
    "Plenty of babies this age nap this way — he's in a very normal rhythm.",
    "At {age_months} months, this feeding pattern is really common.",
    "This is a very typical pattern for his age.",
    "Lots of babies his age do exactly this — one good long nap with shorter ones around it."
  ],
  insights: [
    "Tomorrow his first nap may stretch longer as he catches up.",
    "He may need that first nap a bit earlier if he's still adjusting.",
    "If he keeps fueling up like this, expect another solid anchor nap tomorrow.",
    "Tomorrow might bring a little extra crankiness, so early cues will help.",
    "Chances are he'll even out by bedtime tomorrow."
  ],
  encouragement: [
    "You're doing a wonderful job reading his needs.",
    "Your instincts are spot on.",
    "He's thriving because of the care you're giving.",
    "Consistency like this builds such a strong foundation.",
    "You're giving him exactly what he needs to grow."
  ]
};

export const NightDoulaReview = ({ activities, babyName }: NightDoulaReviewProps) => {
  const { household } = useHousehold();
  const [showReview, setShowReview] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [reviewGenerated, setReviewGenerated] = useState(false);
  const [fullReviewText, setFullReviewText] = useState("");
  const [isPulsing, setIsPulsing] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  // Random selection helper
  const randomChoice = (array: string[]): string => {
    return array[Math.floor(Math.random() * array.length)];
  };

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check if review was already shown today
  useEffect(() => {
    const today = new Date().toDateString();
    const reviewShown = localStorage.getItem(`night-doula-${today}`);
    if (reviewShown) {
      setShowReview(true);
      setTypedText(reviewShown);
      setReviewGenerated(true);
      setShowPhotos(true);
    }
  }, []);

  // Calculate baby's age in months
  const getBabyAgeInMonths = (): number => {
    if (!household?.baby_birthday) return 6;
    const birthDate = new Date(household.baby_birthday);
    const today = new Date();
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                   (today.getMonth() - birthDate.getMonth());
    return Math.max(0, months);
  };

  const getAgeNorms = (ageInMonths: number) => {
    if (ageInMonths <= 2) return AGE_NORMS['0-2'];
    if (ageInMonths <= 4) return AGE_NORMS['3-4'];
    if (ageInMonths <= 6) return AGE_NORMS['5-6'];
    if (ageInMonths <= 9) return AGE_NORMS['7-9'];
    if (ageInMonths <= 12) return AGE_NORMS['10-12'];
    return AGE_NORMS['12+'];
  };

  // Check trigger logic: show for testing during any hour
  useEffect(() => {
    const checkTrigger = () => {
      const now = new Date();
      
      const hasActivitiesToday = activities.some(activity => {
        const activityDate = new Date(activity.logged_at);
        return activityDate.toDateString() === now.toDateString();
      });
      
      if (hasActivitiesToday && !reviewGenerated) {
        setShowPrompt(true);
      }
    };

    checkTrigger();
    const interval = setInterval(checkTrigger, 60000);
    return () => clearInterval(interval);
  }, [activities, reviewGenerated]);

  // Classify naps by duration
  const classifyNaps = (napDurations: number[]): NapClassification => {
    if (napDurations.length === 0) {
      return { type: 'mix', description: 'no naps today' };
    }
    
    const shortNaps = napDurations.filter(d => d <= 40);
    const longNaps = napDurations.filter(d => d >= 60);
    
    if (napDurations.length === 1) {
      return {
        type: napDurations[0] <= 40 ? 'single-short' : 'single-long',
        description: ''
      };
    }
    
    if (shortNaps.length === napDurations.length) {
      return { type: 'all-short', description: '' };
    }
    
    if (longNaps.length === napDurations.length) {
      return { type: 'all-long', description: '' };
    }
    
    return { type: 'mix', description: '' };
  };

  // Extract day stats with comprehensive photo search
  const getDayStats = (date: Date): DayStats => {
    const activities_filtered = activities.filter(activity => {
      const activityDate = new Date(activity.logged_at);
      return activityDate.toDateString() === date.toDateString();
    });

    const feeds = activities_filtered.filter(a => a.type === 'feed');
    const naps = activities_filtered.filter(a => a.type === 'nap' && !a.details?.isNightSleep);
    const bedtimeNap = activities_filtered.find(a => a.type === 'nap' && a.details?.isNightSleep);
    const notes = activities_filtered.filter(a => a.type === 'note');
    const diapers = activities_filtered.filter(a => a.type === 'diaper');

    const volume = feeds.reduce((sum, f) => {
      const qty = f.details?.quantity || 0;
      return sum + (parseFloat(qty as string) || 0);
    }, 0);

    const unit = feeds.find(f => f.details?.unit)?.details?.unit || 'ml';

    const napDuration = naps.reduce((sum, n) => {
      if (n.details?.startTime && n.details?.endTime) {
        const start = new Date(`1970-01-01 ${n.details.startTime}`);
        const end = new Date(`1970-01-01 ${n.details.endTime}`);
        return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
      return sum;
    }, 0);

    const bedtime = bedtimeNap?.details?.startTime || null;
    
    // Comprehensive photo extraction from all activities
    const allPhotos = activities_filtered.flatMap(activity => {
      const activityPhotos = [];
      
      // Check all possible photo fields
      if (activity.details?.photos && Array.isArray(activity.details.photos)) {
        activityPhotos.push(...activity.details.photos);
      }
      if (activity.details?.photo && typeof activity.details.photo === 'string') {
        activityPhotos.push(activity.details.photo);
      }
      if (activity.details?.photo_url && typeof activity.details.photo_url === 'string') {
        activityPhotos.push(activity.details.photo_url);
      }
      if (activity.details?.image && typeof activity.details.image === 'string') {
        activityPhotos.push(activity.details.image);
      }
      if (activity.details?.images && Array.isArray(activity.details.images)) {
        activityPhotos.push(...activity.details.images);
      }
      
      return activityPhotos;
    }).filter(Boolean);

    // Deduplicate photos
    const photos = [...new Set(allPhotos)];

    // Collect diaper observations and full notes
    const allNotes = [...notes, ...diapers.filter(d => 
      d.details?.notes || d.details?.leak || d.details?.blowout || d.details?.rash
    )];

    return {
      feeds: feeds.length,
      volume,
      unit,
      naps: naps.length,
      napDuration,
      bedtime,
      notes: allNotes,
      photos
    };
  };

  // Generate natural, conversational message
  const generateNightDoulaMessage = (): string => {
    const name = babyName || household?.baby_name || "your little one";
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    
    const todayStats = getDayStats(today);
    const yesterdayStats = getDayStats(yesterday);
    const ageInMonths = getBabyAgeInMonths();
    
    let message = "";
    
    // 1. Daily recap - feeds, naps, bedtime
    let feedSentence = randomChoice(LANGUAGE_BANK.feeds);
    feedSentence = feedSentence
      .replace('{baby_name}', name)
      .replace('{feed_count}', todayStats.feeds.toString())
      .replace('{feed_total_ml}', Math.round(todayStats.volume).toString());
    message += feedSentence + " ";
    
    // Naps
    if (todayStats.naps > 0) {
      const napDurations = activities
        .filter(a => a.type === 'nap' && !a.details?.isNightSleep && 
                new Date(a.logged_at).toDateString() === today.toDateString())
        .map(n => {
          if (n.details?.startTime && n.details?.endTime) {
            const start = new Date(`1970-01-01 ${n.details.startTime}`);
            const end = new Date(`1970-01-01 ${n.details.endTime}`);
            return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          }
          return 0;
        })
        .filter(d => d > 0);
      
      const classification = classifyNaps(napDurations);
      const napSentence = randomChoice(LANGUAGE_BANK.naps[classification.type]);
      message += napSentence + " ";
    }
    
    // Bedtime
    if (todayStats.bedtime) {
      let bedtimeSentence = randomChoice(LANGUAGE_BANK.bedtime);
      bedtimeSentence = bedtimeSentence.replace('{bedtime}', todayStats.bedtime);
      message += bedtimeSentence + " ";
    }

    // 2. Parent note reference - prioritize diaper observations
    if (todayStats.notes.length > 0) {
      let noteRef = "";
      let noteEffect = "";
      
      // Check for diaper-specific observations first
      const diaperNote = todayStats.notes.find(note => 
        note.type === 'diaper' && (note.details?.leak || note.details?.blowout || note.details?.rash)
      );
      
      if (diaperNote) {
        if (diaperNote.details?.leak) {
          noteRef = "a leak";
          noteEffect = "fussiness during that change";
        } else if (diaperNote.details?.blowout) {
          noteRef = "a blowout";
          noteEffect = "the extra attention he needed";
        } else if (diaperNote.details?.rash) {
          noteRef = "some redness";
          noteEffect = "why he might have been more sensitive";
        }
      } else {
        // Regular notes - show full content
        const noteContent = todayStats.notes[0].details?.content || 
                           todayStats.notes[0].details?.note || 
                           todayStats.notes[0].details?.text || "";
        
        if (noteContent) {
          // Show more of the note - up to a few sentences
          const fullNote = noteContent.length > 80 ? 
            `${noteContent.slice(0, 80)}...` : noteContent;
          
          if (noteContent.toLowerCase().includes('teeth') || noteContent.toLowerCase().includes('tooth')) {
            noteRef = "teething";
            noteEffect = "shorter naps and extra fussiness";
          } else if (noteContent.toLowerCase().includes('fuss') || noteContent.toLowerCase().includes('cry')) {
            noteRef = "fussiness";
            noteEffect = "extra comfort he needed";
          } else {
            noteRef = `"${fullNote}"`;
            noteEffect = "how his day played out";
          }
        }
      }
      
      if (noteRef) {
        let noteSentence = randomChoice(LANGUAGE_BANK.notes);
        noteSentence = noteSentence
          .replace('{note_reference}', noteRef)
          .replace('{note_related_effect}', noteEffect);
        message += noteSentence + " ";
      }
    }

    // 3. Comparison to yesterday - natural language
    if (yesterdayStats.volume > 0) {
      const volumeDiff = Math.abs(todayStats.volume - yesterdayStats.volume);
      const isSignificant = volumeDiff > todayStats.volume * 0.1;
      
      if (isSignificant) {
        const isMore = todayStats.volume > yesterdayStats.volume;
        const comparison = randomChoice(isMore ? 
          LANGUAGE_BANK.comparison.volume_more : 
          LANGUAGE_BANK.comparison.volume_less
        );
        
        message += `Compared to yesterday, he drank ${comparison}`;
        
        if (volumeDiff > todayStats.volume * 0.2) {
          message += randomChoice(LANGUAGE_BANK.comparison.growth_spurt);
        } else {
          message += ". ";
        }
      } else {
        message += `He drank ${randomChoice(LANGUAGE_BANK.comparison.volume_same)}. `;
      }
    }

    // 4. Peer comparison - normalize
    let peerSentence = randomChoice(LANGUAGE_BANK.peer);
    peerSentence = peerSentence.replace('{age_months}', ageInMonths.toString());
    message += peerSentence + " ";

    // 5. Forward-looking insight
    const insightSentence = randomChoice(LANGUAGE_BANK.insights);
    message += insightSentence + " ";

    // 6. Encouragement
    const encouragementSentence = randomChoice(LANGUAGE_BANK.encouragement);
    message += encouragementSentence;

    return message;
  };

  // Instant reveal on tap
  const handleMessageClick = () => {
    if (isTyping) {
      setTypedText(fullReviewText);
      setCurrentCharIndex(fullReviewText.length);
      setIsTyping(false);
      setIsPulsing(false);
      setShowPhotos(true);
    }
  };

  // ChatGPT-style streaming with natural pauses
  const startReview = useCallback(() => {
    const reviewText = generateNightDoulaMessage();
    setFullReviewText(reviewText);
    setShowReview(true);
    setShowPrompt(false);
    setIsPulsing(true);
    setTypedText("");
    setCurrentCharIndex(0);
    setShowPhotos(false);
    
    // Store in localStorage
    const today = new Date().toDateString();
    localStorage.setItem(`night-doula-${today}`, reviewText);
    setReviewGenerated(true);

    if (prefersReducedMotion) {
      // Respect reduce motion - show instantly
      setTypedText(reviewText);
      setIsTyping(false);
      setIsPulsing(false);
      setShowPhotos(true);
    } else {
      setIsTyping(true);
    }
  }, [activities, babyName, household, prefersReducedMotion]);

  // Smooth, calm typing animation with punctuation pauses
  useEffect(() => {
    if (!isTyping || !fullReviewText || prefersReducedMotion) return;
    
    // Much faster - closer to ChatGPT speed but still calm
    const targetWPM = 150; // Fast enough to feel responsive
    const avgCharsPerWord = 4.7;
    const charsPerMinute = targetWPM * avgCharsPerWord;
    const baseDelay = (60 * 1000) / charsPerMinute; // About 85ms per char
    
    const timer = setTimeout(() => {
      if (currentCharIndex < fullReviewText.length) {
        const currentChar = fullReviewText[currentCharIndex];
        const nextIndex = currentCharIndex + 1;
        
        setTypedText(fullReviewText.substring(0, nextIndex));
        setCurrentCharIndex(nextIndex);
        
        // Add small pauses after punctuation for natural feel
        const isPunctuation = ['.', '!', '?'].includes(currentChar);
        const isComma = currentChar === ',';
        
        if (isPunctuation) {
          // Brief pause after sentences
          setTimeout(() => {}, baseDelay * 1.5);
        } else if (isComma) {
          // Tiny pause after commas
          setTimeout(() => {}, baseDelay * 0.5);
        }
      } else {
        setIsTyping(false);
        setIsPulsing(false);
        setShowPhotos(true);
      }
    }, baseDelay);
    
    return () => clearTimeout(timer);
  }, [currentCharIndex, fullReviewText, isTyping, prefersReducedMotion]);

  if (!showPrompt && !showReview) {
    return null;
  }

  // Show prompt
  if (showPrompt && !showReview) {
    return (
      <Card className="mb-6 bg-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Moon className="w-5 h-5 text-primary" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm font-medium text-foreground">
                Ready to hear how today went?
              </span>
            </div>
            <Button 
              onClick={startReview}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Yes please
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show review with smooth streaming
  const todaysPhotos = getDayStats(new Date()).photos;

  return (
    <Card className="mb-6 bg-card border-border shadow-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Moon className="w-6 h-6 text-primary" />
            {isPulsing && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Night Doula
          </h3>
        </div>
        
        <div className="prose prose-sm max-w-none">
          <div 
            className="text-foreground leading-relaxed text-base cursor-pointer"
            onClick={handleMessageClick}
          >
            {typedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-pulse"></span>
            )}
          </div>
          
          {/* Photos appear after text is complete - no animation, just like texting */}
          {showPhotos && todaysPhotos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {todaysPhotos.map((photo, index) => (
                <img 
                  key={index}
                  src={photo} 
                  alt="Baby photo from today" 
                  className="w-20 h-20 object-cover rounded-lg border border-border"
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};