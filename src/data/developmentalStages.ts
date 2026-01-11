// Developmental Stages Data for 8 Domains
// Age-based stage progression with descriptions, tips, and milestones

export interface StageInfo {
  name: string;
  ageRange: [number, number]; // weeks
  description: string;
  supportTips: string[];
  milestones: string[];
}

export interface DomainConfig {
  id: string;
  label: string;
  color: string;
  stages: StageInfo[];
}

// Sleep Domain
const sleepStages: StageInfo[] = [
  {
    name: "Frequent Waking",
    ageRange: [0, 6],
    description: "Sleep comes in short bursts with no day/night distinction. This is biologically normal.",
    supportTips: [
      "Keep daytime bright and interactive",
      "Nighttime should be dim and quiet",
      "Safe sleep on back in crib"
    ],
    milestones: [
      "Sleeps in 2-4 hour stretches",
      "May have one longer stretch at night"
    ]
  },
  {
    name: "Emerging Patterns",
    ageRange: [7, 12],
    description: "Day/night awareness develops. Sleep starts consolidating into longer chunks.",
    supportTips: [
      "Begin a simple bedtime routine",
      "Watch for sleepy cues",
      "3-4 naps per day is typical"
    ],
    milestones: [
      "One 4-5 hour night stretch",
      "More alert during day",
      "Starting to show drowsy signals"
    ]
  },
  {
    name: "Rhythm Building",
    ageRange: [13, 18],
    description: "True patterns emerge. Baby may have predictable wake windows and nap times.",
    supportTips: [
      "Aim for 3 naps per day",
      "Watch wake windows (1.5-2 hours)",
      "Consistent bedtime helps"
    ],
    milestones: [
      "Longer night stretches (6+ hours)",
      "More predictable nap schedule",
      "May self-soothe briefly"
    ]
  },
  {
    name: "Consolidating",
    ageRange: [19, 26],
    description: "Sleep becomes more mature. Many babies can link sleep cycles at night.",
    supportTips: [
      "Transition to 2-3 naps",
      "Wake windows around 2-2.5 hours",
      "Dark room for naps helps"
    ],
    milestones: [
      "May sleep 8-10 hour stretches",
      "Naps become more predictable",
      "Bedtime routine is soothing"
    ]
  },
  {
    name: "Stable Rhythm",
    ageRange: [27, 40],
    description: "Sleep is more adult-like. Two naps is typical with a clear bedtime.",
    supportTips: [
      "Two solid naps per day",
      "Wake windows 2.5-3 hours",
      "Consistent wake time helps"
    ],
    milestones: [
      "Sleeping through most nights",
      "Two predictable naps",
      "Can self-settle when drowsy"
    ]
  },
  {
    name: "Toddler Transition",
    ageRange: [41, 78],
    description: "Moving toward one nap. Night sleep is generally stable with occasional disruptions.",
    supportTips: [
      "Watch for 2-to-1 nap transition signs",
      "Early bedtime during transitions",
      "Comfort during developmental leaps"
    ],
    milestones: [
      "One long afternoon nap",
      "11-12 hours night sleep",
      "Can fall asleep independently"
    ]
  },
  {
    name: "One Nap Wonder",
    ageRange: [79, 104],
    description: "Solidly on one nap. Sleep is predictable but may resist bedtime occasionally.",
    supportTips: [
      "One 2-3 hour nap works well",
      "Quiet wind-down before bed",
      "Address any fears gently"
    ],
    milestones: [
      "Consistent one nap schedule",
      "Full night sleep most nights",
      "Understands bedtime routine"
    ]
  }
];

// Feeding Domain
const feedingStages: StageInfo[] = [
  {
    name: "On-Demand",
    ageRange: [0, 6],
    description: "Feeding around the clock with no schedule. Cluster feeding is common, especially evenings.",
    supportTips: [
      "Feed on demand (8-12 times/day)",
      "Watch for hunger cues",
      "Night feeds are normal and necessary"
    ],
    milestones: [
      "Gaining weight steadily",
      "Wet and dirty diapers daily",
      "Alert periods after some feeds"
    ]
  },
  {
    name: "Finding Rhythm",
    ageRange: [7, 12],
    description: "Feeds may space out slightly. Still needs frequent nutrition but patterns emerge.",
    supportTips: [
      "Feed every 2-3 hours during day",
      "Allow longer night stretches",
      "Burp frequently if needed"
    ],
    milestones: [
      "Longer stretches between feeds",
      "More efficient at eating",
      "Social smiles after feeding"
    ]
  },
  {
    name: "Efficient Eating",
    ageRange: [13, 18],
    description: "Baby is faster at feeding. May show interest in watching others eat.",
    supportTips: [
      "6-8 feeds per day typically",
      "Full feeds prevent snacking",
      "Reduce distractions during feeds"
    ],
    milestones: [
      "Finishes bottles/nurses faster",
      "Clear hunger and fullness cues",
      "May watch you eat with interest"
    ]
  },
  {
    name: "Pre-Solids Interest",
    ageRange: [19, 26],
    description: "Ready signs for solids may appear. Still primarily milk-fed but curiosity grows.",
    supportTips: [
      "Watch for readiness signs",
      "Can sit with support for feeding",
      "Milk remains primary nutrition"
    ],
    milestones: [
      "Shows interest in food",
      "Good head control",
      "Tongue thrust reflex fading"
    ]
  },
  {
    name: "Exploring Solids",
    ageRange: [27, 40],
    description: "First foods introduced. Learning to eat is messy and wonderful. Milk still primary.",
    supportTips: [
      "Offer iron-rich foods first",
      "One new food every few days",
      "Texture progression matters"
    ],
    milestones: [
      "Opens mouth for spoon",
      "Moves food to back of mouth",
      "Beginning to enjoy meal times"
    ]
  },
  {
    name: "Growing Appetite",
    ageRange: [41, 52],
    description: "Solids become more central. Working on finger foods and self-feeding skills.",
    supportTips: [
      "3 meals plus snacks",
      "Soft finger foods for practice",
      "Milk reduced to 16-24 oz/day"
    ],
    milestones: [
      "Picks up small foods (pincer grasp)",
      "Drinks from sippy cup",
      "Chewing improves"
    ]
  },
  {
    name: "Independent Eater",
    ageRange: [53, 78],
    description: "Eating mostly table foods. Self-feeding improves. Appetite varies day to day.",
    supportTips: [
      "Offer variety without pressure",
      "Transition to whole milk at 12 months",
      "Utensil practice encouraged"
    ],
    milestones: [
      "Uses spoon with some success",
      "Drinks from open cup",
      "Has food preferences"
    ]
  },
  {
    name: "Toddler Eating",
    ageRange: [79, 104],
    description: "Opinionated eater! Pickiness is normal. Eating is social and emotional.",
    supportTips: [
      "Don't force foods",
      "Repeated exposure works",
      "Eat together as family"
    ],
    milestones: [
      "Uses fork sometimes",
      "Expresses preferences clearly",
      "Can eat most table foods"
    ]
  }
];

// Physical (Gross Motor) Domain
const physicalStages: StageInfo[] = [
  {
    name: "Reflexive",
    ageRange: [0, 4],
    description: "Movement is mostly reflexive. Building neck and core strength begins.",
    supportTips: [
      "Tummy time in short bursts",
      "Support head when holding",
      "Let baby kick freely"
    ],
    milestones: [
      "Turns head side to side",
      "Brief head lifts in tummy time",
      "Reflexive arm/leg movements"
    ]
  },
  {
    name: "Head Control",
    ageRange: [5, 12],
    description: "Head control strengthens. May start pushing up during tummy time.",
    supportTips: [
      "Increase tummy time duration",
      "Play face-to-face on floor",
      "Support sitting practice"
    ],
    milestones: [
      "Holds head steady",
      "Pushes up on arms",
      "Reaches for toys on floor"
    ]
  },
  {
    name: "Rolling Ready",
    ageRange: [13, 18],
    description: "Rolling attempts begin. Core strength builds. May pivot on tummy.",
    supportTips: [
      "Safe floor space for rolling",
      "Encourage reaching across body",
      "Celebrate attempts!"
    ],
    milestones: [
      "Rolls tummy to back",
      "May roll back to tummy",
      "Pivots in circle on floor"
    ]
  },
  {
    name: "Sitting Emerging",
    ageRange: [19, 26],
    description: "Sitting with support, then briefly alone. Rolling is confident.",
    supportTips: [
      "Practice sitting with pillows around",
      "Offer toys while sitting",
      "Let them work through wobbles"
    ],
    milestones: [
      "Sits with minimal support",
      "Catches self when falling",
      "Rolling is easy"
    ]
  },
  {
    name: "Mobile",
    ageRange: [27, 40],
    description: "Crawling, scooting, or bum-shuffling begins. Into everything!",
    supportTips: [
      "Baby-proof the home",
      "Let them explore safely",
      "Avoid walkers"
    ],
    milestones: [
      "Crawls or scoots",
      "Pulls to stand",
      "May cruise along furniture"
    ]
  },
  {
    name: "Cruising & Standing",
    ageRange: [41, 52],
    description: "Standing confidently. Cruising expands. First steps may appear.",
    supportTips: [
      "Push toys support walking",
      "Barefoot is best for learning",
      "Expect lots of falls"
    ],
    milestones: [
      "Stands alone briefly",
      "Cruises confidently",
      "May take first steps"
    ]
  },
  {
    name: "Walking",
    ageRange: [53, 78],
    description: "Walking becomes primary movement. Running attempts begin.",
    supportTips: [
      "Safe spaces to practice",
      "Climbing is developmentally appropriate",
      "Outdoor exploration is great"
    ],
    milestones: [
      "Walks confidently",
      "Can squat and stand",
      "Beginning to run"
    ]
  },
  {
    name: "Running & Climbing",
    ageRange: [79, 104],
    description: "Running, climbing, jumping! Physical confidence grows.",
    supportTips: [
      "Daily active play",
      "Safe climbing opportunities",
      "Balls and ride-on toys"
    ],
    milestones: [
      "Runs with coordination",
      "Climbs playground equipment",
      "May jump with both feet"
    ]
  }
];

// Fine Motor Domain
const fineMotorStages: StageInfo[] = [
  {
    name: "Reflexive Grasp",
    ageRange: [0, 8],
    description: "Hands mostly closed. Grasps reflexively when palm touched.",
    supportTips: [
      "Let baby hold your finger",
      "Gentle hand massage",
      "High contrast toys to look at"
    ],
    milestones: [
      "Reflexive grasp",
      "Hands near mouth",
      "Watches hands occasionally"
    ]
  },
  {
    name: "Discovering Hands",
    ageRange: [9, 16],
    description: "Hands open more. Batting at toys. Brings hands together.",
    supportTips: [
      "Offer rattles to grasp",
      "Play gym encourages reaching",
      "Let hands explore textures"
    ],
    milestones: [
      "Grasps toys briefly",
      "Brings hands to midline",
      "Watches hands with fascination"
    ]
  },
  {
    name: "Intentional Reach",
    ageRange: [17, 26],
    description: "Reaching is purposeful. Transfers objects between hands.",
    supportTips: [
      "Offer varied textures",
      "Sitting supports hand play",
      "Mouthing is learning"
    ],
    milestones: [
      "Reaches and grabs accurately",
      "Transfers hand to hand",
      "Explores by mouthing"
    ]
  },
  {
    name: "Raking Grasp",
    ageRange: [27, 35],
    description: "Uses whole hand to pick up objects. Pokes and prods.",
    supportTips: [
      "Safe small objects to explore",
      "Board books to flip",
      "Finger foods for practice"
    ],
    milestones: [
      "Rakes small objects toward self",
      "Points with whole hand",
      "Bangs toys together"
    ]
  },
  {
    name: "Pincer Emerging",
    ageRange: [36, 44],
    description: "Thumb and finger come together. Beginning to pick up smaller items.",
    supportTips: [
      "Cheerios or puffs for practice",
      "Stacking toys",
      "Simple shape sorters"
    ],
    milestones: [
      "Pincer grasp developing",
      "Can release objects intentionally",
      "Stacks 2 blocks"
    ]
  },
  {
    name: "Refined Pincer",
    ageRange: [45, 60],
    description: "Neat pincer grasp. Can pick up small items with precision.",
    supportTips: [
      "Crayons and paper",
      "Posting toys",
      "Playdough exploration"
    ],
    milestones: [
      "Precise pincer grasp",
      "Scribbles with crayon",
      "Turns pages (several at once)"
    ]
  },
  {
    name: "Tool Use",
    ageRange: [61, 78],
    description: "Using utensils, crayons, and tools with increasing control.",
    supportTips: [
      "Spoon and fork practice",
      "Drawing and painting",
      "Building with blocks"
    ],
    milestones: [
      "Feeds self with spoon",
      "Stacks multiple blocks",
      "Makes lines on paper"
    ]
  },
  {
    name: "Precision Growing",
    ageRange: [79, 104],
    description: "Fine motor control improves. Can manipulate small objects well.",
    supportTips: [
      "Puzzles and threading toys",
      "Scissors with supervision",
      "Dressing practice"
    ],
    milestones: [
      "Turns pages one at a time",
      "Draws circles",
      "Can undress somewhat"
    ]
  }
];

// Language Domain
const languageStages: StageInfo[] = [
  {
    name: "Crying & Listening",
    ageRange: [0, 6],
    description: "Communicates through crying. Listens intently to voices.",
    supportTips: [
      "Talk to baby often",
      "Respond to cries",
      "Sing songs and rhymes"
    ],
    milestones: [
      "Different cries for different needs",
      "Startles at loud sounds",
      "Calms to familiar voice"
    ]
  },
  {
    name: "Cooing",
    ageRange: [7, 12],
    description: "Social smiles and coos appear. Beginning to 'converse' with sounds.",
    supportTips: [
      "Copy baby's sounds back",
      "Pause for their 'reply'",
      "Read simple books"
    ],
    milestones: [
      "Coos and gurgles",
      "Smiles responsively",
      "Makes eye contact during sounds"
    ]
  },
  {
    name: "Babbling Begins",
    ageRange: [13, 22],
    description: "Babbling with consonant sounds. Loves vocal play.",
    supportTips: [
      "Imitate their babbles",
      "Name objects often",
      "Songs with actions"
    ],
    milestones: [
      "Babbles 'ba-ba', 'da-da'",
      "Laughs out loud",
      "Responds to name"
    ]
  },
  {
    name: "Expressive Babbling",
    ageRange: [23, 35],
    description: "Babbling sounds like conversation. May say 'mama' or 'dada' (not specific yet).",
    supportTips: [
      "Narrate your day",
      "Ask simple questions",
      "Respond to babbles meaningfully"
    ],
    milestones: [
      "Varied babbling patterns",
      "Tries to imitate words",
      "Understands 'no' tone"
    ]
  },
  {
    name: "First Words",
    ageRange: [36, 52],
    description: "First true words appear. Understands far more than can say.",
    supportTips: [
      "Celebrate attempts",
      "Expand on their words",
      "Don't correct, just model"
    ],
    milestones: [
      "1-5 words used consistently",
      "Points with intent",
      "Follows simple commands"
    ]
  },
  {
    name: "Word Building",
    ageRange: [53, 78],
    description: "Vocabulary growing. May combine words. Understands much more.",
    supportTips: [
      "Read together daily",
      "Name feelings and objects",
      "Wait for their response"
    ],
    milestones: [
      "20-50+ words",
      "May put 2 words together",
      "Follows 2-step directions"
    ]
  },
  {
    name: "Language Explosion",
    ageRange: [79, 104],
    description: "Vocabulary explodes. Sentences emerge. Asks 'why?' constantly!",
    supportTips: [
      "Answer questions patiently",
      "Use full sentences",
      "Encourage storytelling"
    ],
    milestones: [
      "100+ words",
      "Uses 2-3 word sentences",
      "Talks about experiences"
    ]
  }
];

// Social Domain
const socialStages: StageInfo[] = [
  {
    name: "Bonding",
    ageRange: [0, 6],
    description: "Forming primary attachments. Recognizes caregivers' faces and voices.",
    supportTips: [
      "Lots of skin-to-skin",
      "Respond consistently",
      "Gentle eye contact"
    ],
    milestones: [
      "Recognizes caregivers",
      "Calms with familiar people",
      "Brief eye contact"
    ]
  },
  {
    name: "Social Smiling",
    ageRange: [7, 12],
    description: "True social smiles appear! Loves interaction with faces.",
    supportTips: [
      "Play face-to-face",
      "Respond to smiles with smiles",
      "Simple peekaboo"
    ],
    milestones: [
      "Smiles at people",
      "Enjoys being held",
      "Watches faces intently"
    ]
  },
  {
    name: "Interactive Play",
    ageRange: [13, 22],
    description: "Laughs, responds to games. Shows preference for familiar people.",
    supportTips: [
      "Peekaboo and pat-a-cake",
      "Take turns in games",
      "Introduce to other babies"
    ],
    milestones: [
      "Laughs during play",
      "Reaches for familiar faces",
      "May be wary of strangers"
    ]
  },
  {
    name: "Attachment Deepens",
    ageRange: [23, 35],
    description: "Strong attachment is clear. Stranger wariness peaks. Separation anxiety begins.",
    supportTips: [
      "Brief separations are okay",
      "Reassure upon return",
      "Consistent caregivers help"
    ],
    milestones: [
      "Clear favorite people",
      "Separation anxiety present",
      "May cling when tired"
    ]
  },
  {
    name: "Social Reference",
    ageRange: [36, 52],
    description: "Looks to you for reactions. Shares attention to objects. Waves and claps.",
    supportTips: [
      "Model calm reactions",
      "Encourage sharing experiences",
      "Praise social efforts"
    ],
    milestones: [
      "Waves bye-bye",
      "Looks to you for approval",
      "Points to share interest"
    ]
  },
  {
    name: "Parallel Play",
    ageRange: [53, 78],
    description: "Plays alongside other children. Beginning to notice what others do.",
    supportTips: [
      "Playdates with supervision",
      "Model sharing and taking turns",
      "Name emotions"
    ],
    milestones: [
      "Plays near other kids",
      "Shows objects to others",
      "May offer toys briefly"
    ]
  },
  {
    name: "Emerging Sharing",
    ageRange: [79, 104],
    description: "Beginning to share and take turns with support. Empathy emerges.",
    supportTips: [
      "Practice taking turns",
      "Praise sharing attempts",
      "Talk about others' feelings"
    ],
    milestones: [
      "Shares with prompting",
      "Notices when others are upset",
      "Interactive play moments"
    ]
  }
];

// Cognitive Domain
const cognitiveStages: StageInfo[] = [
  {
    name: "Sensory Learning",
    ageRange: [0, 8],
    description: "Learning through senses. High contrast, sounds, and touch are fascinating.",
    supportTips: [
      "Black and white images",
      "Varied sounds and music",
      "Let baby watch movement"
    ],
    milestones: [
      "Tracks moving objects",
      "Startles at sounds",
      "Recognizes caregiver's smell"
    ]
  },
  {
    name: "Cause & Effect Emerging",
    ageRange: [9, 18],
    description: "Beginning to connect actions with results. Repeats enjoyable activities.",
    supportTips: [
      "Cause-effect toys",
      "React to baby's actions",
      "Repeat games they enjoy"
    ],
    milestones: [
      "Repeats actions for effect",
      "Shakes rattles intentionally",
      "Shows anticipation"
    ]
  },
  {
    name: "Object Exploration",
    ageRange: [19, 30],
    description: "Explores objects thoroughly. Beginning object permanence.",
    supportTips: [
      "Varied toys to explore",
      "Peekaboo with hiding",
      "Simple problem-solving toys"
    ],
    milestones: [
      "Looks for dropped objects",
      "Explores toys in multiple ways",
      "Finds partially hidden toy"
    ]
  },
  {
    name: "Object Permanence",
    ageRange: [31, 44],
    description: "Knows objects exist when hidden. Searches for hidden toys.",
    supportTips: [
      "Hide and seek with toys",
      "Containers and lids",
      "Simple puzzles"
    ],
    milestones: [
      "Finds hidden objects",
      "Beginning problem-solving",
      "Uses objects as tools"
    ]
  },
  {
    name: "Functional Play",
    ageRange: [45, 60],
    description: "Uses objects for intended purpose. Beginning pretend play.",
    supportTips: [
      "Realistic play items",
      "Pretend phone, keys, etc.",
      "Simple sorting activities"
    ],
    milestones: [
      "Uses phone on ear",
      "Drinks from empty cup",
      "Copies daily activities"
    ]
  },
  {
    name: "Symbolic Thinking",
    ageRange: [61, 78],
    description: "Pretend play expands. Can represent one thing with another.",
    supportTips: [
      "Open-ended toys",
      "Join their pretend play",
      "Encourage imagination"
    ],
    milestones: [
      "Pretends with dolls/animals",
      "Uses block as 'phone'",
      "Short pretend sequences"
    ]
  },
  {
    name: "Problem Solver",
    ageRange: [79, 104],
    description: "Increasing problem-solving. Longer attention span. Curious about 'how' and 'why'.",
    supportTips: [
      "Let them try before helping",
      "Ask open-ended questions",
      "Puzzles and building"
    ],
    milestones: [
      "Solves simple puzzles",
      "Follows 2-3 step sequences",
      "Asks questions"
    ]
  }
];

// Emotional Domain
const emotionalStages: StageInfo[] = [
  {
    name: "Basic Needs",
    ageRange: [0, 8],
    description: "Emotions are tied to physical needs. Comfort comes from caregivers.",
    supportTips: [
      "Respond to distress quickly",
      "Consistent soothing routines",
      "Calm presence matters"
    ],
    milestones: [
      "Calms when picked up",
      "Shows distress clearly",
      "Contentment after needs met"
    ]
  },
  {
    name: "Social Emotions",
    ageRange: [9, 18],
    description: "Joy and social connection appear. Expresses pleasure and displeasure clearly.",
    supportTips: [
      "Mirror their joy",
      "Name what they're feeling",
      "Comfort during distress"
    ],
    milestones: [
      "Laughs and shows joy",
      "Fusses when frustrated",
      "Seeks comfort when upset"
    ]
  },
  {
    name: "Emotional Range",
    ageRange: [19, 35],
    description: "More emotions visible: fear, frustration, excitement. Big feelings, little body.",
    supportTips: [
      "Validate all feelings",
      "Stay calm during outbursts",
      "Offer comfort objects"
    ],
    milestones: [
      "Shows fear of strangers",
      "Frustration visible",
      "Comfort object may emerge"
    ]
  },
  {
    name: "Testing Independence",
    ageRange: [36, 52],
    description: "Wants to do things independently. Frustration when limited. First tantrums may appear.",
    supportTips: [
      "Offer safe choices",
      "Empathize with frustration",
      "Stay patient through tantrums"
    ],
    milestones: [
      "Says 'no' with feeling",
      "Tantrums may occur",
      "Shows pride in accomplishments"
    ]
  },
  {
    name: "Self-Awareness",
    ageRange: [53, 70],
    description: "Beginning to recognize self in mirror. Self-conscious emotions emerge (shame, pride).",
    supportTips: [
      "Praise effort not just outcome",
      "Name complex emotions",
      "Gentle on mistakes"
    ],
    milestones: [
      "Recognizes self in mirror",
      "Shows shame or embarrassment",
      "Expresses affection"
    ]
  },
  {
    name: "Empathy Emerging",
    ageRange: [71, 90],
    description: "Notices others' emotions. May try to comfort others. Understanding feelings.",
    supportTips: [
      "Talk about others' feelings",
      "Model empathy",
      "Books about emotions"
    ],
    milestones: [
      "Notices when others are sad",
      "May offer comfort",
      "Uses feeling words"
    ]
  },
  {
    name: "Regulation Growing",
    ageRange: [91, 104],
    description: "Beginning to manage emotions with support. Still needs help with big feelings.",
    supportTips: [
      "Teach calming strategies",
      "Co-regulate through outbursts",
      "Celebrate coping attempts"
    ],
    milestones: [
      "Can sometimes wait briefly",
      "Uses some calming strategies",
      "Names own feelings"
    ]
  }
];

// Export all domains
export const developmentalDomains: DomainConfig[] = [
  { id: "sleep", label: "Sleep", color: "chart-sleep", stages: sleepStages },
  { id: "feeding", label: "Feeding", color: "chart-feed", stages: feedingStages },
  { id: "physical", label: "Physical", color: "primary", stages: physicalStages },
  { id: "fine-motor", label: "Fine Motor", color: "accent-1", stages: fineMotorStages },
  { id: "language", label: "Language", color: "accent-2", stages: languageStages },
  { id: "social", label: "Social", color: "chart-sleep", stages: socialStages },
  { id: "cognitive", label: "Cognitive", color: "primary", stages: cognitiveStages },
  { id: "emotional", label: "Emotional", color: "accent-1", stages: emotionalStages }
];

// Helper function to calculate current stage for a domain based on age
export function calculateStage(
  domainId: string,
  ageInWeeks: number,
  confirmedStageNumber?: number
): { stage: StageInfo; stageNumber: number; isEmerging: boolean } | null {
  const domain = developmentalDomains.find((d) => d.id === domainId);
  if (!domain) return null;

  const stages = domain.stages;
  
  // Find the stage based on age
  let calculatedStageNumber = 1;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (ageInWeeks >= stages[i].ageRange[0]) {
      calculatedStageNumber = i + 1;
      break;
    }
  }

  // If user confirmed a higher stage, use that
  const finalStageNumber = confirmedStageNumber && confirmedStageNumber > calculatedStageNumber
    ? confirmedStageNumber
    : calculatedStageNumber;

  const stageIndex = Math.min(finalStageNumber - 1, stages.length - 1);
  const stage = stages[stageIndex];

  // Check if in emerging zone (within 2 weeks of next stage)
  const nextStageIndex = stageIndex + 1;
  const isEmerging = nextStageIndex < stages.length && 
    ageInWeeks >= (stages[nextStageIndex].ageRange[0] - 2);

  return {
    stage,
    stageNumber: finalStageNumber,
    isEmerging
  };
}

// Helper to get domain by ID
export function getDomainById(domainId: string): DomainConfig | undefined {
  return developmentalDomains.find((d) => d.id === domainId);
}
