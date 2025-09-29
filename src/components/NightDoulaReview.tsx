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
  '0-2': { feeds: [8, 12], naps: [4, 6], napTime: [4, 6] },
  '3-4': { feeds: [6, 10], naps: [4, 5], napTime: [4, 5] },
  '5-6': { feeds: [5, 8], naps: [3, 4], napTime: [3, 4] },
  '7-9': { feeds: [4, 7], naps: [2, 3], napTime: [2.5, 3.5] },
  '10-12': { feeds: [3, 6], naps: [2, 3], napTime: [2, 3] },
  '12+': { feeds: [3, 5], naps: [1, 2], napTime: [1.5, 2.5] }
};

// Sentence library for varied responses with improved tone
const SENTENCE_LIBRARY = {
  feeds: [
    "{baby_name} had {feed_count} feeds today, about {feed_total_ml} ml in total.",
    "{baby_name} finished {feed_count} feeds today, around {feed_total_ml} ml altogether.",
    "Today's tally: {feed_count} feeds, adding up to about {feed_total_ml} ml.",
    "{baby_name} got in {feed_count} feeds, for roughly {feed_total_ml} ml overall."
  ],
  naps: {
    'all-short': [
      "All of his naps were on the shorter side, around 30 minutes each.",
      "He only managed catnaps today, nothing longer than half an hour.",
      "Every nap was brief today, closer to 30 minutes."
    ],
    'all-long': [
      "He took solid stretches today, each well over an hour.",
      "All of his naps today were longer ones, more than an hour each.",
      "Nice long naps throughout — each lasting over an hour."
    ],
    'mix': [
      "His naps were a mix — one solid stretch late morning and two shorter catnaps.",
      "He balanced a long nap with a couple of shorter ones.",
      "Today had variety: one good anchor nap and two quicker ones."
    ],
    'single-short': [
      "He had one shorter nap today, around {duration} minutes.",
      "Just one catnap today, about {duration} minutes.",
      "He managed one brief nap, closer to {duration} minutes."
    ],
    'single-long': [
      "He took one solid stretch today, just over {duration} hours.",
      "One good long nap today, lasting about {duration} hours.",
      "He had one anchor nap today, around {duration} hours."
    ]
  },
  bedtime: [
    "Bedtime was {bedtime}.",
    "He settled for the night at {bedtime}.",
    "Down for sleep at {bedtime}.",
    "He was ready for bed by {bedtime}."
  ],
  notes: [
    "Since you noted {note_reference}, that may explain {note_related_effect}.",
    "You mentioned {note_reference} — that could explain {note_related_effect}.",
    "With {note_reference} going on, {note_related_effect} makes sense.",
    "Given the {note_reference} you tracked, {note_related_effect} is pretty typical.",
    "I noticed you logged {note_reference} — that often affects {note_related_effect}."
  ],
  comparison: {
    feeds_more: [
      "Compared to yesterday, he drank about {diff} ml more",
      "He took in {diff} ml more than yesterday",
      "That's {diff} ml extra compared to yesterday"
    ],
    feeds_less: [
      "Compared to yesterday, he drank about {diff} ml less", 
      "That's {diff} ml less than yesterday's intake",
      "He took in {diff} ml less than the day before"
    ],
    naps_more: [
      "and slept about {diff} minutes more during the day",
      "with {diff} more minutes of daytime sleep",
      "and got {diff} extra minutes of nap time"
    ],
    naps_less: [
      "and slept a bit less during the day",
      "with shorter naps overall",
      "and got less daytime sleep"
    ],
    growth_spurt: [
      ", which often points to a growth spurt.",
      " — classic growth spurt pattern.",
      ", which lots of babies do right before a leap."
    ]
  },
  peer: [
    "Lots of {age_months}-month-olds do this exact mix — an anchor nap with quick ones around it — so he's right in range.",
    "Most babies his age have {nap_count} naps with at least one longer stretch, so this pattern is really common.",
    "For {age_months} months, this feeding rhythm is exactly what I see with lots of babies — {feed_count} feeds is spot on.",
    "Babies his age typically do {feed_count}-{feed_upper} feeds daily, so he's tracking beautifully."
  ],
  insights: [
    "Tomorrow he may want his first nap a little earlier if he's catching up.",
    "He might sleep a bit longer overnight after that extra intake.",
    "Watch for him to be extra sleepy tomorrow morning after this pattern.",
    "He may cluster feed again tomorrow if this growth spurt continues.",
    "Tomorrow's first nap might be his longest if he's still adjusting."
  ],
  encouragement: [
    "You're giving him exactly the rhythm he needs.",
    "You're reading his cues perfectly.",
    "He's thriving with your steady guidance.",
    "You're doing exactly what he needs right now.",
    "Your instincts are serving him so well."
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

  // Random selection helper
  const randomChoice = (array: string[]): string => {
    return array[Math.floor(Math.random() * array.length)];
  };

  // Check if review was already shown today
  useEffect(() => {
    const today = new Date().toDateString();
    const reviewShown = localStorage.getItem(`night-doula-${today}`);
    if (reviewShown) {
      setShowReview(true);
      setTypedText(reviewShown);
      setReviewGenerated(true);
    }
  }, []);

  // Calculate baby's age in months
  const getBabyAgeInMonths = (): number => {
    if (!household?.baby_birthday) return 6; // Default to 6 months
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

  // Check trigger logic: show for testing during any hour, remove the time restriction temporarily
  useEffect(() => {
    const checkTrigger = () => {
      const now = new Date();
      
      const hasActivitiesToday = activities.some(activity => {
        const activityDate = new Date(activity.logged_at);
        return activityDate.toDateString() === now.toDateString();
      });
      
      // For testing: show if there are any activities today, regardless of time
      if (hasActivitiesToday && !reviewGenerated) {
        setShowPrompt(true);
        console.log('Night Doula Debug - Trigger activated:', { hasActivitiesToday, reviewGenerated });
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
        description: napDurations[0] <= 40 ? 
          `one shorter nap around ${napDurations[0]} minutes` :
          `one solid stretch, just over ${Math.round(napDurations[0] / 60 * 10) / 10} hours`
      };
    }
    
    if (shortNaps.length === napDurations.length) {
      return {
        type: 'all-short',
        description: `all on the shorter side, around ${Math.round(napDurations.reduce((a, b) => a + b) / napDurations.length)} minutes each`
      };
    }
    
    if (longNaps.length === napDurations.length) {
      return {
        type: 'all-long',
        description: `${longNaps.length} solid stretches, each over an hour`
      };
    }
    
    return {
      type: 'mix',
      description: `a mix — ${shortNaps.length} short nap${shortNaps.length > 1 ? 's' : ''} and ${longNaps.length} long anchor nap${longNaps.length > 1 ? 's' : ''}`
    };
  };

  // Extract day stats
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
    
    // Extract photos from ALL activities, not just notes
    const photos = activities_filtered.flatMap(activity => {
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
      
      return activityPhotos;
    }).filter(Boolean);

    // Collect diaper-specific notes and observations
    const diaperObservations = diapers.flatMap(d => {
      const observations = [];
      if (d.details?.notes) observations.push(d.details.notes);
      if (d.details?.leak) observations.push('leak');
      if (d.details?.blowout) observations.push('blowout');
      if (d.details?.rash) observations.push('diaper rash');
      if (d.details?.type) observations.push(d.details.type);
      return observations;
    }).filter(Boolean);

    console.log('Night Doula Debug - Enhanced Day Stats:', {
      date: date.toDateString(),
      feeds: feeds.length,
      volume,
      naps: naps.length,
      diapers: diapers.length,
      notesCount: notes.length,
      photosCount: photos.length,
      diaperObservations,
      noteContents: notes.map(n => n.details?.content || n.details?.note || ''),
      photoSources: photos,
      allActivityDetails: activities_filtered.map(a => ({ type: a.type, details: a.details }))
    });

    return {
      feeds: feeds.length,
      volume,
      unit,
      naps: naps.length,
      napDuration,
      bedtime,
      notes: [...notes, ...diapers.filter(d => d.details?.notes || d.details?.leak || d.details?.blowout || d.details?.rash)],
      photos
    };
  };

  // Generate the night doula message using sentence library - ALWAYS include all 6 sections
  const generateNightDoulaMessage = (): string => {
    const name = babyName || household?.baby_name || "your little one";
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    
    const todayStats = getDayStats(today);
    const yesterdayStats = getDayStats(yesterday);
    
    const ageInMonths = getBabyAgeInMonths();
    const norms = getAgeNorms(ageInMonths);
    
    let sentences: string[] = [];
    
    // 1. RECAP: Feeds, Naps, Bedtime (always include)
    let feedSentence = randomChoice(SENTENCE_LIBRARY.feeds);
    feedSentence = feedSentence
      .replace('{baby_name}', name)
      .replace('{feed_count}', todayStats.feeds.toString())
      .replace('{feed_total_ml}', Math.round(todayStats.volume).toString());
    sentences.push(feedSentence);
    
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
      let napSentence = randomChoice(SENTENCE_LIBRARY.naps[classification.type] || SENTENCE_LIBRARY.naps.mix);
      
      if (classification.type === 'single-short' || classification.type === 'single-long') {
        const duration = classification.type === 'single-short' ? 
          napDurations[0] : 
          Math.round(napDurations[0] / 60 * 10) / 10;
        napSentence = napSentence.replace('{duration}', duration.toString());
      }
      
      sentences.push(napSentence);
    }
    
    // Bedtime
    if (todayStats.bedtime) {
      let bedtimeSentence = randomChoice(SENTENCE_LIBRARY.bedtime);
      bedtimeSentence = bedtimeSentence.replace('{bedtime}', todayStats.bedtime);
      sentences.push(bedtimeSentence);
    }
    
    // 2. COMPARISON to Yesterday (always include at least one concrete diff)
    const volumeDiff = Math.abs(todayStats.volume - yesterdayStats.volume);
    const napDiff = Math.abs(todayStats.napDuration - yesterdayStats.napDuration);
    let comparisonSentence = "";
    
    if (volumeDiff > 0 || yesterdayStats.volume === 0) {
      const isMore = todayStats.volume > yesterdayStats.volume;
      const feedComp = randomChoice(isMore ? SENTENCE_LIBRARY.comparison.feeds_more : SENTENCE_LIBRARY.comparison.feeds_less);
      comparisonSentence = feedComp.replace('{diff}', Math.round(volumeDiff).toString());
      
      // Add nap comparison
      if (napDiff > 10) {
        const napComp = randomChoice(todayStats.napDuration > yesterdayStats.napDuration ? 
          SENTENCE_LIBRARY.comparison.naps_more : SENTENCE_LIBRARY.comparison.naps_less);
        comparisonSentence += " " + napComp.replace('{diff}', Math.round(napDiff).toString());
      }
      
      // Add growth spurt indicator if significant increase
      if (volumeDiff > todayStats.volume * 0.15) {
        comparisonSentence += randomChoice(SENTENCE_LIBRARY.comparison.growth_spurt);
      } else {
        comparisonSentence += ".";
      }
    } else {
      // Fallback comparison
      comparisonSentence = `Compared to yesterday, his rhythm stayed pretty consistent.`;
    }
    
    sentences.push(comparisonSentence);
    
    // 3. PEER Normalization (specific, not vague)
    let peerSentence = randomChoice(SENTENCE_LIBRARY.peer);
    peerSentence = peerSentence
      .replace('{age_months}', ageInMonths.toString())
      .replace('{nap_count}', todayStats.naps.toString())
      .replace('{feed_count}', todayStats.feeds.toString())
      .replace('{feed_upper}', norms.feeds[1].toString());
    sentences.push(peerSentence);
    
    // 4. PARENT NOTE Reference - Focus on diaper observations and specific notes
    if (todayStats.notes.length > 0) {
      const allObservations = todayStats.notes.map(note => {
        // Check for diaper-specific observations first
        if (note.type === 'diaper') {
          const diaperNotes = [];
          if (note.details?.leak) diaperNotes.push('leak');
          if (note.details?.blowout) diaperNotes.push('blowout');
          if (note.details?.rash) diaperNotes.push('diaper rash');
          if (note.details?.notes) diaperNotes.push(note.details.notes);
          return diaperNotes.join(', ');
        }
        
        // Regular notes - don't truncate
        return note.details?.content || note.details?.note || note.details?.text || "";
      }).filter(Boolean);
      
      if (allObservations.length > 0) {
        let noteSentence = randomChoice(SENTENCE_LIBRARY.notes);
        let noteRef = allObservations[0];
        let noteEffect = "how his day went";
        
        // Diaper-specific interpretations
        if (noteRef.includes('leak')) {
          noteRef = "a leak";
          noteEffect = "why he seemed fussier during that change";
        } else if (noteRef.includes('blowout')) {
          noteRef = "a blowout";
          noteEffect = "the extra attention he needed after that change";
        } else if (noteRef.includes('diaper rash') || noteRef.includes('rash')) {
          noteRef = "some redness";
          noteEffect = "why he might have been more sensitive today";
        } else if (noteRef.includes('teeth') || noteRef.includes('tooth')) {
          noteRef = "teething";
          noteEffect = "the shorter afternoon nap";
        } else if (noteRef.includes('fuss') || noteRef.includes('cry')) {
          noteRef = "fussiness";
          noteEffect = "the extra comfort he needed";
        } else if (noteRef.includes('growth') || noteRef.includes('hungry')) {
          noteRef = "extra hunger";
          noteEffect = "those additional feeds";
        } else if (noteRef.includes('sleep') || noteRef.includes('tired')) {
          noteRef = "extra sleepiness";
          noteEffect = "the longer naps";
        } else if (noteRef.length > 5) {
          // Show more of the note without truncating aggressively
          noteRef = noteRef.length > 40 ? `"${noteRef.slice(0, 40)}..."` : `"${noteRef}"`;
          noteEffect = "how his day played out";
        }
        
        noteSentence = noteSentence
          .replace('{note_reference}', noteRef)
          .replace('{note_related_effect}', noteEffect);
        sentences.push(noteSentence);
        
        console.log('Night Doula Debug - Note Reference:', { 
          noteRef, 
          noteEffect, 
          noteSentence,
          allObservations 
        });
      }
    } else {
      console.log('Night Doula Debug - No notes found for today');
    }
    
    // 5. FORWARD-LOOKING Insight (1 line prediction/tip)
    const insightSentence = randomChoice(SENTENCE_LIBRARY.insights);
    sentences.push(insightSentence);
    
    // 6. ENCOURAGEMENT (always)
    const encouragementSentence = randomChoice(SENTENCE_LIBRARY.encouragement);
    sentences.push(encouragementSentence);
    
    return sentences.join(' ');
  };

  // ChatGPT-style streaming effect
  const startReview = useCallback(() => {
    const reviewText = generateNightDoulaMessage();
    setFullReviewText(reviewText);
    setShowReview(true);
    setShowPrompt(false);
    setIsTyping(true);
    setIsPulsing(true);
    setTypedText("");
    setCurrentCharIndex(0);
    
    // Store in localStorage
    const today = new Date().toDateString();
    localStorage.setItem(`night-doula-${today}`, reviewText);
    
    setReviewGenerated(true);
  }, [activities, babyName, household]);

  // Smooth streaming animation effect - calming and consistent
  useEffect(() => {
    if (!isTyping || !fullReviewText) return;
    
    const targetWPM = 60; // Slower, more calming pace
    const avgCharsPerWord = 4.7;
    const charsPerMinute = targetWPM * avgCharsPerWord;
    const msPerChar = (60 * 1000) / charsPerMinute;
    
    const timer = setTimeout(() => {
      if (currentCharIndex < fullReviewText.length) {
        // Consistent character advancement - no jitter for smooth feel
        const nextIndex = Math.min(currentCharIndex + 1, fullReviewText.length);
        setTypedText(fullReviewText.substring(0, nextIndex));
        setCurrentCharIndex(nextIndex);
      } else {
        setIsTyping(false);
        setIsPulsing(false);
      }
    }, msPerChar);
    
    return () => clearTimeout(timer);
  }, [currentCharIndex, fullReviewText, isTyping]);

  // Don't show if no trigger conditions met
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

  // Show review with streaming
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
          <div className="text-foreground leading-relaxed text-base">
            {typedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-pulse"></span>
            )}
          </div>
          
          {/* Photos appear after text is complete */}
          {!isTyping && getDayStats(new Date()).photos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {getDayStats(new Date()).photos.map((photo, index) => (
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