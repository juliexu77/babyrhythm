// Based on Huckleberry's age-appropriate nap schedules

export interface NapSchedule {
  ageStart: number; // weeks
  ageEnd: number; // weeks  
  totalNaps: number;
  napWindows: {
    start: string;
    end: string;
    duration: string;
  }[];
  wakeWindows: string[];
  bedtime: string;
  totalSleep: string;
}

export const huckleberrySchedules: NapSchedule[] = [
  {
    ageStart: 0,
    ageEnd: 6,
    totalNaps: 4-6,
    napWindows: [
      { start: "9:00 AM", end: "10:30 AM", duration: "30m-2h" },
      { start: "12:00 PM", end: "1:30 PM", duration: "30m-2h" },
      { start: "3:00 PM", end: "4:30 PM", duration: "30m-2h" },
      { start: "5:30 PM", end: "6:30 PM", duration: "15m-45m" }
    ],
    wakeWindows: ["45m-1h"],
    bedtime: "7:00-8:00 PM",
    totalSleep: "14-17 hours"
  },
  {
    ageStart: 7,
    ageEnd: 15,
    totalNaps: 3-4,
    napWindows: [
      { start: "9:00 AM", end: "10:30 AM", duration: "1-2h" },
      { start: "1:00 PM", end: "2:30 PM", duration: "1-2h" },
      { start: "4:30 PM", end: "5:30 PM", duration: "30m-1h" }
    ],
    wakeWindows: ["1.5-2.5h"],
    bedtime: "7:00-8:00 PM", 
    totalSleep: "12-15 hours"
  },
  {
    ageStart: 16,
    ageEnd: 35,
    totalNaps: 2,
    napWindows: [
      { start: "9:30 AM", end: "11:00 AM", duration: "1-1.5h" },
      { start: "2:00 PM", end: "3:30 PM", duration: "1-2h" }
    ],
    wakeWindows: ["2.5-3.5h"],
    bedtime: "7:00-8:00 PM",
    totalSleep: "11-14 hours"
  },
  {
    ageStart: 36,
    ageEnd: 64,
    totalNaps: 1,
    napWindows: [
      { start: "1:00 PM", end: "3:00 PM", duration: "1-2h" }
    ],
    wakeWindows: ["5-6h"],
    bedtime: "7:00-8:00 PM",
    totalSleep: "10-13 hours"
  },
  {
    ageStart: 65,
    ageEnd: 260, // 5 years
    totalNaps: 0,
    napWindows: [],
    wakeWindows: ["All day"],
    bedtime: "7:30-8:30 PM",
    totalSleep: "10-12 hours"
  }
];

export function getScheduleForAge(ageInWeeks: number): NapSchedule | null {
  return huckleberrySchedules.find(
    schedule => ageInWeeks >= schedule.ageStart && ageInWeeks <= schedule.ageEnd
  ) || null;
}

export function calculateAgeInWeeks(birthday: string): number {
  const birthDate = new Date(birthday);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - birthDate.getTime());
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
}

export function getNextNapRecommendation(
  ageInWeeks: number, 
  lastNapEndTime?: string,
  lastWakeTime?: string
): {
  nextNapTime?: string;
  reason: string;
  confidence: number;
} {
  const schedule = getScheduleForAge(ageInWeeks);
  
  if (!schedule || schedule.totalNaps === 0) {
    return {
      reason: "No naps recommended for this age",
      confidence: 0.9
    };
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Find the next recommended nap window
  for (const napWindow of schedule.napWindows) {
    const [startHour, startMin] = napWindow.start.split(':').map(num => {
      const n = parseInt(num.replace(/[^0-9]/g, ''));
      return napWindow.start.includes('PM') && n !== 12 ? n + 12 : 
             napWindow.start.includes('AM') && n === 12 ? 0 : n;
    });
    
    const napStartTime = startHour * 60 + startMin;
    
    if (napStartTime > currentTime) {
      const nextNapHour = Math.floor(napStartTime / 60);
      const nextNapMin = napStartTime % 60;
      const period = nextNapHour >= 12 ? 'PM' : 'AM';
      const displayHour = nextNapHour === 0 ? 12 : nextNapHour > 12 ? nextNapHour - 12 : nextNapHour;
      
      return {
        nextNapTime: `${displayHour}:${nextNapMin.toString().padStart(2, '0')} ${period}`,
        reason: `Based on Huckleberry's schedule for ${Math.floor(ageInWeeks)} week old babies`,
        confidence: 0.8
      };
    }
  }
  
  // If no more naps today, suggest tomorrow's first nap
  if (schedule.napWindows.length > 0) {
    return {
      nextNapTime: schedule.napWindows[0].start,
      reason: "No more naps recommended today. Next nap tomorrow",
      confidence: 0.7
    };
  }
  
  return {
    reason: "No specific nap time recommendation available",
    confidence: 0.3
  };
}

export function getBedtimeRecommendation(ageInWeeks: number): {
  bedtime: string;
  reason: string;
} {
  const schedule = getScheduleForAge(ageInWeeks);
  
  if (!schedule) {
    return {
      bedtime: "7:30-8:30 PM",
      reason: "Standard bedtime recommendation"
    };
  }
  
  return {
    bedtime: schedule.bedtime,
    reason: `Recommended bedtime for ${Math.floor(ageInWeeks)} week old babies`
  };
}