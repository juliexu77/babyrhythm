// Age-appropriate baselines compiled from multiple expert sources:
// - Huckleberry's sleep data and research
// - Taking Cara Babies schedules
// - American Academy of Pediatrics sleep guidelines
// This is the single source of truth for age-appropriate expectations

export interface WakeWindowData {
  ageStart: number; // weeks
  ageEnd: number; // weeks  
  wakeWindows: string[];
  napCount: string;
  totalSleep: string;
}

export const huckleberryWakeWindows: WakeWindowData[] = [
  // 0-2 weeks
  { ageStart: 0, ageEnd: 2, wakeWindows: ["45min-1hr"], napCount: "6-8", totalSleep: "16-20hrs" },
  // 3-4 weeks  
  { ageStart: 3, ageEnd: 4, wakeWindows: ["1-1.5hrs"], napCount: "5-7", totalSleep: "15-18hrs" },
  // 5-8 weeks
  { ageStart: 5, ageEnd: 8, wakeWindows: ["1.5-2hrs"], napCount: "4-6", totalSleep: "14-17hrs" },
  // 9-12 weeks (3 months)
  { ageStart: 9, ageEnd: 12, wakeWindows: ["1.5-2.5hrs"], napCount: "4-5", totalSleep: "14-16hrs" },
  // 13-16 weeks (4 months)
  { ageStart: 13, ageEnd: 16, wakeWindows: ["2-2.5hrs"], napCount: "3-4", totalSleep: "12-15hrs" },
  // 17-20 weeks (5 months)
  { ageStart: 17, ageEnd: 20, wakeWindows: ["2.5-3hrs"], napCount: "3", totalSleep: "12-15hrs" },
  // 21-24 weeks (6 months)
  { ageStart: 21, ageEnd: 24, wakeWindows: ["2.5-3.5hrs"], napCount: "3", totalSleep: "12-14hrs" },
  // 25-35 weeks (6-8 months)
  { ageStart: 25, ageEnd: 35, wakeWindows: ["3-3.5hrs"], napCount: "2", totalSleep: "12-14hrs" },
  // 36-52 weeks (9-12 months)
  { ageStart: 36, ageEnd: 52, wakeWindows: ["3.5-4hrs"], napCount: "2", totalSleep: "11-14hrs" },
  // 53-65 weeks (13-15 months)
  { ageStart: 53, ageEnd: 65, wakeWindows: ["4-5hrs"], napCount: "1-2", totalSleep: "11-13hrs" },
  // 66-78 weeks (16-18 months)  
  { ageStart: 66, ageEnd: 78, wakeWindows: ["5-6hrs"], napCount: "1", totalSleep: "11-13hrs" },
  // 79-104 weeks (18-24 months)
  { ageStart: 79, ageEnd: 104, wakeWindows: ["5-6hrs"], napCount: "1", totalSleep: "11-13hrs" },
  // 105-156 weeks (2-3 years)
  { ageStart: 105, ageEnd: 156, wakeWindows: ["6-7hrs"], napCount: "0-1", totalSleep: "10-12hrs" },
  // 157-208 weeks (3-4 years)
  { ageStart: 157, ageEnd: 208, wakeWindows: ["All day"], napCount: "0", totalSleep: "10-12hrs" },
  // 209-260 weeks (4-5 years)
  { ageStart: 209, ageEnd: 260, wakeWindows: ["All day"], napCount: "0", totalSleep: "10-12hrs" }
];

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
    totalNaps: 5,
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
    totalNaps: 3,
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

export function getFeedingGuidanceForAge(ageInWeeks: number) {
  if (ageInWeeks < 2) {
    return {
      frequency: "Every 1-3 hours",
      amount: "1-3 oz (30-90ml)",
      dailyTotal: "8-12 feeds",
      notes: "Newborns need frequent small feeds. Follow baby's hunger cues."
    };
  } else if (ageInWeeks < 4) {
    return {
      frequency: "Every 2-3 hours", 
      amount: "2-4 oz (60-120ml)",
      dailyTotal: "8-10 feeds",
      notes: "Feeding patterns are becoming more predictable."
    };
  } else if (ageInWeeks < 8) {
    return {
      frequency: "Every 3-4 hours",
      amount: "3-5 oz (90-150ml)", 
      dailyTotal: "6-8 feeds",
      notes: "Baby can go longer between feeds now."
    };
  } else if (ageInWeeks < 12) {
    return {
      frequency: "Every 3-4 hours",
      amount: "4-6 oz (120-180ml)",
      dailyTotal: "5-7 feeds", 
      notes: "Sleep periods are getting longer, affecting feeding schedule."
    };
  } else if (ageInWeeks < 26) {
    return {
      frequency: "Every 4-5 hours",
      amount: "6-8 oz (180-240ml)",
      dailyTotal: "4-6 feeds",
      notes: "May start showing interest in solid foods around 4-6 months."
    };
  } else {
    return {
      frequency: "Every 4-6 hours",
      amount: "6-8 oz (180-240ml)",
      dailyTotal: "3-5 feeds",
      notes: "Solid foods are becoming a bigger part of nutrition."
    };
  }
}

export function getWakeWindowForAge(ageInWeeks: number): WakeWindowData | null {
  return huckleberryWakeWindows.find(
    data => ageInWeeks >= data.ageStart && ageInWeeks <= data.ageEnd
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