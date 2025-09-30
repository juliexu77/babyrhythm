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
  tips: {
    rash: [
      "A thin layer of Vaseline before each diaper can help prevent future redness.",
      "Letting him air dry for a few minutes during changes can work wonders for sensitive skin.",
      "Sometimes switching to a different diaper brand helps with recurring redness."
    ],
    leak: [
      "Going up a diaper size at night often stops those early morning leaks.",
      "Making sure the leg cuffs are pulled out can prevent most side leaks.",
      "Double-check that frilly edges around the legs aren't tucked in — they're meant to stick out."
    ],
    growth_spurt: [
      "Growth spurts usually last 2-3 days, so this extra hunger should level out soon.",
      "Cluster feeding in the evening often means a longer sleep stretch afterward.",
      "Many babies get extra sleepy the day after a big feeding day — it's all that growing!"
    ],
    sleep: [
      "A slightly cooler room (68-70°F) often helps babies sleep longer stretches.",
      "White noise at about the volume of a shower can really improve nap quality.",
      "If he startles awake, waiting 2-3 minutes before going in gives him a chance to settle back down."
    ],
    feeding: [
      "Burping halfway through a feed often prevents those post-meal hiccups.",
      "If he's getting fussy during feeds, try switching sides or taking a little break.",
      "Babies often feed more efficiently when they're calm, so no rush if he needs a moment."
    ]
  },
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
  const [reviewGenerated, setReviewGenerated] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [showPhotos, setShowPhotos] = useState(false);

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
      setReviewText(reviewShown);
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

  // Extract day stats with consistent date handling (same as timeline)
  const getDayStats = (date: Date): DayStats => {
    const activities_filtered = activities.filter(activity => {
      const activityDate = new Date(activity.logged_at);
      // Use same local date logic as timeline to avoid timezone issues
      const localActivityDate = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
      const localTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return localActivityDate.getTime() === localTargetDate.getTime();
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
      
      // Check all possible photo fields (including camelCase from Supabase)
      if (activity.details?.photos && Array.isArray(activity.details.photos)) {
        activityPhotos.push(...activity.details.photos);
      }
      if (activity.details?.photo && typeof activity.details.photo === 'string') {
        activityPhotos.push(activity.details.photo);
      }
      if (activity.details?.photoUrl && typeof activity.details.photoUrl === 'string') {
        activityPhotos.push(activity.details.photoUrl);
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
      d.details?.note || d.details?.hasLeak || d.details?.blowout || d.details?.rash
    )];

    console.log('Night Doula Debug - Enhanced Day Stats:', {
      date: date.toDateString(),
      photosCount: photos.length,
      photoSources: photos,
      diaperCount: diapers.length,
      diaperDetails: diapers.map(d => ({ 
        hasLeak: d.details?.hasLeak, 
        diaperType: d.details?.diaperType,
        hasCream: d.details?.hasCream,
        note: d.details?.note,
        hasRashInNote: d.details?.note?.toLowerCase().includes('rash')
      })),
      notesCount: allNotes.length,
      activitiesWithPhotos: activities_filtered.filter(a => 
        a.details?.photoUrl || a.details?.photo || a.details?.photos
      ).map(a => ({ 
        type: a.type, 
        photoUrl: a.details?.photoUrl,
        photo: a.details?.photo,
        photos: a.details?.photos 
      })),
      allActivitiesDetails: activities_filtered.map(a => ({ type: a.type, details: a.details }))
    });

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
      
      // Check for diaper-specific observations first (using correct field names)
      const diaperNote = todayStats.notes.find(note => {
        if (note.type === 'diaper') {
          const noteText = note.details?.note || "";
          return note.details?.hasLeak || 
                 note.details?.blowout || 
                 note.details?.rash ||
                 noteText.toLowerCase().includes('rash') ||
                 noteText.toLowerCase().includes('red');
        }
        return false;
      });
      
      if (diaperNote) {
        const noteText = diaperNote.details?.note || "";
        
        if (diaperNote.details?.hasLeak) {
          noteRef = "a leak";
          noteEffect = "fussiness during that change";
        } else if (noteText.toLowerCase().includes('rash') || noteText.toLowerCase().includes('red')) {
          noteRef = "some redness";
          noteEffect = "why he might have been more sensitive today";
        } else if (diaperNote.details?.blowout) {
          noteRef = "a blowout";
          noteEffect = "the extra attention he needed";
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

    // 5. Forward-looking insight with contextual tips
    let insightWithTip = randomChoice(LANGUAGE_BANK.insights);
    
    // Add contextual tips based on today's observations
    if (todayStats.notes.some(note => 
      note.type === 'diaper' && (note.details?.note?.toLowerCase().includes('rash') || note.details?.note?.toLowerCase().includes('red'))
    )) {
      // Diaper rash tip
      const rashTip = randomChoice(LANGUAGE_BANK.tips.rash);
      insightWithTip += ` Pro tip: ${rashTip}`;
    } else if (todayStats.notes.some(note => 
      note.type === 'diaper' && note.details?.hasLeak
    )) {
      // Leak prevention tip
      const leakTip = randomChoice(LANGUAGE_BANK.tips.leak);
      insightWithTip += ` Pro tip: ${leakTip}`;
    } else if (yesterdayStats.volume > 0 && todayStats.volume > yesterdayStats.volume * 1.2) {
      // Growth spurt tip
      const growthTip = randomChoice(LANGUAGE_BANK.tips.growth_spurt);
      insightWithTip += ` Pro tip: ${growthTip}`;
    } else if (todayStats.napDuration < 120 && todayStats.naps >= 2) {
      // Short naps tip
      const sleepTip = randomChoice(LANGUAGE_BANK.tips.sleep);
      insightWithTip += ` Pro tip: ${sleepTip}`;
    } else if (Math.random() > 0.5) {
      // Random feeding tip sometimes
      const feedingTip = randomChoice(LANGUAGE_BANK.tips.feeding);
      insightWithTip += ` Pro tip: ${feedingTip}`;
    }
    
    message += insightWithTip + " ";

    // 6. Encouragement
    const encouragementSentence = randomChoice(LANGUAGE_BANK.encouragement);
    message += encouragementSentence;

    return message;
  };

  // Simple start review - just show with fade-in
  const startReview = useCallback(() => {
    const reviewText = generateNightDoulaMessage();
    setReviewText(reviewText);
    setShowReview(true);
    setShowPrompt(false);
    setReviewGenerated(true);
    setShowPhotos(true);
    
    // Store in localStorage
    const today = new Date().toDateString();
    localStorage.setItem(`night-doula-${today}`, reviewText);
  }, [activities, babyName, household]);

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
    <Card className="mb-6 bg-card border-border shadow-card animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Moon className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Night Doula
          </h3>
        </div>
        
        <div className="prose prose-sm max-w-none">
          <div className="text-foreground leading-relaxed text-base">
            {reviewText}
          </div>
          
          {/* Photos - full width like social media */}
          {showPhotos && todaysPhotos.length > 0 && (
            <div className="mt-6 space-y-3 animate-fade-in">
              {todaysPhotos.map((photo, index) => (
                <img 
                  key={index}
                  src={photo} 
                  alt="Baby photo from today" 
                  className="w-full max-w-md mx-auto rounded-xl border border-border shadow-md object-cover"
                  style={{ aspectRatio: '4/3' }}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};