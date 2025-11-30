// Developmental milestones data: Weeks 0-16, Months 4-12
// Warm pediatrician tone + CDC Development + TCB Feel + Tribal Knowledge

export interface MilestoneSet {
  emergingSkills: string[];
  communication: string[];
  playCuriosity: string[];
  tribalTip?: string;
  reminder?: string;
}

export const weeklyMilestones: Record<number, MilestoneSet> = {
  0: {
    emergingSkills: [
      "Adjusting to new light, sound, and touch",
      "Movements are mostly reflexive",
      "Sleep fills most of the day"
    ],
    communication: [
      "Crying is their main language",
      "Many babies settle with skin contact, gentle rocking, or your voice"
    ],
    playCuriosity: [
      "During brief alert moments, may focus on high-contrast shapes",
      "Your face held close captures attention"
    ],
    reminder: "There is no expected rhythm yet. All patterns are normal at this stage."
  },
  1: {
    emergingSkills: [
      "Tiny head lifts may appear",
      "Movements begin feeling a bit smoother"
    ],
    communication: [
      "Recognizes your voice",
      "May pause or quiet briefly when hearing it"
    ],
    playCuriosity: [
      "Faces and slow movement capture attention best"
    ],
    tribalTip: "Newborns see best at 8–12 inches, roughly the distance to your face while holding them.",
    reminder: "Everything still changes day to day."
  },
  2: {
    emergingSkills: [
      "Sucking has more rhythm",
      "Hands may open more often and move toward center"
    ],
    communication: [
      "Cries begin to sound slightly different for different needs"
    ],
    playCuriosity: [
      "May study your face for longer stretches"
    ],
    tribalTip: "Hand-to-mouth movements help babies feel organized and calm.",
    reminder: "Short awake windows are expected."
  },
  3: {
    emergingSkills: [
      "Head lifting during tummy time strengthens",
      "Muscles feel slightly firmer"
    ],
    communication: [
      "Soft coos may appear",
      "Beginning to react to your tone of voice"
    ],
    playCuriosity: [
      "May follow gentle motion or light shifts across the room"
    ],
    tribalTip: "Many parents notice sounds like 'neh' for hunger and 'eh' for a burp.",
    reminder: "All skill appearance varies widely."
  },
  4: {
    emergingSkills: [
      "Head and neck control improve",
      "Arm and leg movements look more intentional"
    ],
    communication: [
      "Social smiles often appear around now",
      "Timing is very individual"
    ],
    playCuriosity: [
      "May track slow movement more steadily",
      "Beginning to notice simple colors"
    ],
    tribalTip: "A sleepy cry can begin with an 'owh' sound, shaped by a wide open mouth.",
    reminder: "Smiles can appear anytime between 4 and 8 weeks."
  },
  5: {
    emergingSkills: [
      "Upper body strength grows",
      "Often bringing hands toward center of chest"
    ],
    communication: [
      "More vocal sounds appear",
      "Seeking comfort through your presence"
    ],
    playCuriosity: [
      "Tracking moving objects becomes more reliable"
    ],
    tribalTip: "Bicycle legs can help relieve gas by supporting digestion.",
    reminder: "Awake windows are still short but feel more meaningful."
  },
  6: {
    emergingSkills: [
      "Movements feel more purposeful",
      "Many babies start batting at toys"
    ],
    communication: [
      "Smiles become more consistent",
      "Eye contact grows richer"
    ],
    playCuriosity: [
      "May look closely at your expressions",
      "Reacts with delight"
    ],
    tribalTip: "A gentle 'heh' sound can appear when babies feel mildly uncomfortable.",
    reminder: "Growth spurts can change sleep or feeding temporarily."
  },
  7: {
    emergingSkills: [
      "Head control increases",
      "Tummy time strength continues improving"
    ],
    communication: [
      "More cooing and early playful noises",
      "Enjoys short social games"
    ],
    playCuriosity: [
      "Hands become interesting objects to study",
      "May watch them move"
    ],
    tribalTip: "Parents often get better at distinguishing hunger, burping, and tired cries.",
    reminder: "Daily rhythms still shift easily."
  },
  8: {
    emergingSkills: [
      "Reaching becomes smoother",
      "Some babies begin early rolling motions"
    ],
    communication: [
      "Vocal play and eye contact deepen"
    ],
    playCuriosity: [
      "Color vision sharpens",
      "Beginning to notice brighter hues and textures"
    ],
    tribalTip: "Cry cues remain helpful but don't need to be perfect. Understanding grows naturally.",
    reminder: "Rolling may appear anytime between 3 and 6 months."
  },
  9: {
    emergingSkills: [
      "Hands often reach the mouth intentionally",
      "Tummy time sessions become stronger"
    ],
    communication: [
      "May create longer strings of coos and squeals"
    ],
    playCuriosity: [
      "Swatting, early grabbing, and following moving toys",
      "More coordinated movements"
    ],
    tribalTip: "A hungry cry may still begin with a 'neh' while a burp cry starts with an 'eh'.",
    reminder: "Variability is still very normal."
  },
  10: {
    emergingSkills: [
      "Some babies roll from tummy to back",
      "Head control strengthens"
    ],
    communication: [
      "May watch your expressions closely",
      "Attempting simple sound imitation"
    ],
    playCuriosity: [
      "Reaching and grabbing look more intentional"
    ],
    tribalTip: "Cry patterns begin blending as babies become more expressive.",
    reminder: "Sleep often shifts around this time."
  },
  11: {
    emergingSkills: [
      "Reaching becomes more accurate",
      "Torso strength increases"
    ],
    communication: [
      "Vocal play expands",
      "Shows excitement during social exchanges"
    ],
    playCuriosity: [
      "Beginning to observe cause-and-effect",
      "Noticing when they make a toy move"
    ],
    tribalTip: "Babies love watching your mouth as you talk. This helps them learn early language patterns.",
    reminder: "Skill timelines vary widely."
  },
  12: {
    emergingSkills: [
      "Rolling attempts increase",
      "Many babies push up strongly on forearms"
    ],
    communication: [
      "Laughter often appears",
      "Social play becomes livelier"
    ],
    playCuriosity: [
      "Toy study becomes more detailed",
      "Turning and tapping objects"
    ],
    tribalTip: "Babies this age enjoy seeing you smile and hearing a warm, sing-song voice.",
    reminder: "All of this can unfold over several weeks."
  },
  13: {
    emergingSkills: [
      "May bear more weight on legs when supported",
      "Head control is strong"
    ],
    communication: [
      "Vocal sounds grow more varied",
      "Recognizes familiar voices quickly"
    ],
    playCuriosity: [
      "Interest in simple actions like tapping or shaking toys increases"
    ],
    tribalTip: "Babies love gentle repetition. Doing the same play pattern a few times helps their brain process it.",
    reminder: "Each baby follows a unique path."
  },
  14: {
    emergingSkills: [
      "Rolling may become more fluid",
      "Some show early interest in sitting with support"
    ],
    communication: [
      "Back-and-forth interactions become more fun",
      "More expressive exchanges"
    ],
    playCuriosity: [
      "Reaching becomes more deliberate",
      "May explore a favorite toy repeatedly"
    ],
    tribalTip: "Babies often enjoy seeing the same object in different orientations. This builds visual understanding.",
    reminder: "Attention spans continue to grow slowly."
  },
  15: {
    emergingSkills: [
      "Push-ups become stronger",
      "Pivoting in tummy time may appear"
    ],
    communication: [
      "Babbling begins to resemble early conversation rhythms"
    ],
    playCuriosity: [
      "May grab, turn, and mouth objects to study them"
    ],
    tribalTip: "Mouthing is a key way babies learn about texture and shape.",
    reminder: "Sleep and feeding shifts sometimes accompany new skills."
  },
  16: {
    emergingSkills: [
      "Some show interest in supported sitting",
      "Rolling may be more consistent"
    ],
    communication: [
      "Babbling becomes more complex",
      "Shows enthusiasm when interacting with familiar people"
    ],
    playCuriosity: [
      "Toy exploration includes shaking, tapping, and studying small details"
    ],
    tribalTip: "Babies may enjoy peekaboo-like interactions, which support early social awareness.",
    reminder: "There is a wide range of normal progression here."
  }
};

// Placeholder for monthly milestones (4-12 months) - to be filled in
export const monthlyMilestones: Record<number, MilestoneSet> = {};

export const getMilestonesForAge = (ageInWeeks: number): MilestoneSet | null => {
  // For weeks 0-16, use weekly milestones
  if (ageInWeeks <= 16) {
    return weeklyMilestones[ageInWeeks] || weeklyMilestones[Math.min(ageInWeeks, 16)];
  }
  
  // For older babies, convert to months and use monthly milestones (placeholder)
  const ageInMonths = Math.floor(ageInWeeks / 4.33);
  if (monthlyMilestones[ageInMonths]) {
    return monthlyMilestones[ageInMonths];
  }
  
  // Return the latest weekly milestone if no monthly data yet
  return weeklyMilestones[16];
};
