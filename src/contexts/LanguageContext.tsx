import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // App name and core  
    appName: "Baby Tracker",
    welcome: "Welcome back",
    
    // Authentication
    signIn: "Sign In",
    signUp: "Sign Up",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    enterEmail: "Enter your email",
    enterPassword: "Enter password",
    createAccount: "Create account",
    signInWithGoogle: "Sign in with Google",
    tagline: "Track your little one's precious moments",
    
    // Main app
    todaysActivities: "Today's Activities",
    noActivitiesYet: "No activities yet today",
    tapToAddFirst: "Tap the + button to add your first activity",
    
    // Navigation
    home: "Home",
    insights: "Insights",
    trends: "Trends",
    calendar: "Calendar",
    profile: "Profile",
    settings: "Settings",
    
    // Baby profile
    babyName: "Baby Name",
    babyBirthday: "Birthday",
    setupProfile: "Let's set up your baby's profile",
    
    // Activities
    feeding: "Feeding",
    diaper: "Diaper",
    nap: "Nap",
    note: "Note",
    startTime: "Start Time",
    duration: "Duration",
    amount: "Amount",
    type: "Type",
    
    // Profile
    language: "Language",
    theme: "Theme",
    signOut: "Sign Out",
    continue: "Continue",
    
    // Onboarding
    welcomeToApp: "Stay in sync with your baby",
    simplestWay: "The simplest way to track your baby's daily activities and patterns.",
    trackEverything: "Track Everything",
    logFeeds: "Log feeds, diaper changes, naps, and notes with just a few taps.",
    shareWithCaregivers: "Share with Caregivers",
    invitePartners: "Invite partners and babysitters to stay updated on your baby's activities.",
    getStarted: "Get Started",
    
    // Common actions
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    
    // Auth page
    signInToAccount: "Sign in to your account or create a new one",
    orContinueWith: "Or continue with",
    yourDataWontBeSaved: "Your data won't be saved across devices",
    
    // Baby setup
    personalizeExperience: "Let's personalize your tracking experience",
    birthday: "Birthday",
    selectBirthdate: "Select birthdate",
    
    // Average daily
    avgDailyFeeds: "Avg Daily Feeds",
    avgDailyDiapers: "Avg Daily Diapers",
    
    // Settings page
    profileSettings: "Profile Settings",
    usingAs: "Using as:",
    signInToSave: "Sign in to save your data across devices",
    changePassword: "Change Password",
    passwordChangeEmailSent: "Password change email sent",
    checkEmailForInstructions: "Check your email for password change instructions.",
    errorSendingEmail: "Error sending email",
    failedToSendEmail: "Failed to send password change email. Please try again.",
    switchAppLanguage: "Switch app language",
    babyDetails: "Baby Details",
    babyInfoSavedLocally: "Baby information is saved locally. Sign in to sync across devices.",
    enterBabyName: "Enter baby's name",
    inviteCaretakers: "Invite Caretakers",
    shareTrackingWith: "Share tracking with family and caregivers",
    shareInviteLink: "Share Invite Link",
    signInToShare: "Sign In to Share",
    linkCopied: "Link Copied!",
    manageCaregivers: "Manage Caregivers",
    caregivers: "Caregivers",
    inviteShared: "Invite shared!",
    shareDialogOpened: "Share dialog opened successfully.",
    inviteLinkCopied: "Invite link copied!",
    shareWithPartner: "Share this link with your partner or caregiver.",
    failedToCreateInvite: "Failed to create invite",
    pleaseRetryInvite: "Please try again.",
    profileUpdated: "Profile updated",
    nameHasBeenSaved: "Your name has been saved.",
    errorUpdatingProfile: "Error updating profile",
    failedToUpdateProfile: "Failed to update profile. Please try again.",
    roleUpdated: "Role updated",
    roleChangedTo: "Your role has been changed to",
    errorUpdatingRole: "Error updating role",
    failedToUpdateRole: "Failed to update your role. Please try again.",
    failedToSaveBabyName: "Failed to save baby name",
    failedToUpdateBabyName: "Failed to update baby name",
    failedToSaveName: "Failed to save name",
    appPreferences: "App Preferences",
    account: "Account",
    done: "Done",
    currentCaregivers: "Current Caregivers",
    selectBirthday: "Select birthday",
    youAre: "You are",
    
    // Time-related
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    
    // Chart and insights
    nextPredictedAction: "Next Predicted Action",
    patternInsights: "Pattern Insights",
    dailySleepTotals: "Daily Sleep Totals",
    wakeWindows: "Wake Windows",
    sleepPatterns: "Sleep Patterns",
    feedingPatterns: "Feeding Patterns",
    avgDailySleep: "Avg Daily Sleep",
    feedingAround: "Feeding around",
    napAround: "Nap around",
    likelyFeedingWhenWakesUp: "Likely feeding when baby wakes up",
    mayNeedAnotherNap: "May need another nap after this sleep",
    considerFeeding: "Consider feeding",
    watchForSleepyCues: "Watch for sleepy cues",
    currentlySleeping: "currently sleeping",
    lastFed: "Last fed",
    ago: "ago",
    awake: "awake",
    continueCurrentActivity: "continue current activity",
    
    // Sleep chart
    weeklySleepSchedule: "Weekly Sleep Schedule",
    thisWeek: "This Week",
    lastWeek: "Last Week",
    showFullDay: "Show full day (12am-12am)",
    showCondensed: "Show condensed (6am-9pm)",
    sleepOn: "Sleep on",
    sleepSession: "Sleep Session",
    start: "Start",
    end: "End",
    
    // Day names (abbreviated)
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    
    // Pattern insights generated text
    usuallyFeedsEvery: "Usually feeds every",
    feedsEvery: "Feeds every",
    feedingTimesVary: "Feeding times vary - growing appetite?",
    napsBeforeNoon: "naps before noon",
    napsAfterLunch: "naps after lunch",
    yourBabyStaysAwake: "Your baby stays awake",
    betweenNaps: "between naps",
    bedtimeTrending: "Bedtime trending",
    nowAround: "- now",
    consistentBedtime: "Consistent bedtime routine",
    averageBedtime: "Average bedtime this week",
    moreFeeds: "more feeds",
    onWeekends: "on weekends",
    lessFeeds: "less feeds",
    morningFeeder: "Morning feeder",
    eveningFeeder: "Evening feeder",
    wakeWindow: "wake window",
    
    // Insight descriptions
    basedOnIntervals: "Based on {count} feeding intervals, the average time between feeds is {hours} hours.",
    highlyPredictable: "Highly predictable feeding pattern with only {minutes} minutes variation from {hours}h average.",
    feedingIntervalsVary: "Feeding intervals vary by {minutes} minutes on average, which could indicate growth spurts or changing needs.",
    strongMorningNap: "Strong morning nap pattern detected. {morning} out of {total} naps occur before 12 PM.",
    afternoonSleepPreference: "Afternoon sleep preference identified. {afternoon} out of {total} naps happen between 12-6 PM.",
    wakeWindowPattern: "Based on {count} wake windows between naps over the past week, your baby typically stays awake for {time} between naps. This pattern helps predict optimal nap timing across days.",
    bedtimeOver: "Over the past {days} days, bedtime has been trending {direction}. Current average is {time}, which is {minutes} minutes {direction} than earlier this week.",
    consistentBedtimeDesc: "Your baby has a consistent bedtime around {time}. This stable routine is great for healthy sleep patterns.",
    avgBedtimeDesc: "Based on {days} recent days, your baby's average bedtime is around {time}. Keep tracking to see if patterns emerge.",
    weekendFeedsDesc: "Weekend feeding patterns differ from weekdays. Averaging {weekend} feeds on weekends vs {weekday} on weekdays.",
    later: "later",
    earlier: "earlier",
    
    // Feeding guidance notes
    newbornsFeedFrequent: "Newborns need frequent small feeds. Follow baby's hunger cues.",
    feedingPatternsBecoming: "Feeding patterns are becoming more predictable.",
    babyCanGoLonger: "Baby can go longer between feeds now.",
    sleepPeriodsLonger: "Sleep periods are getting longer, affecting feeding schedule.",
    mayStartSolids: "May start showing interest in solid foods around 4-6 months.",
    solidsBecomingBigger: "Solid foods are becoming a bigger part of nutrition.",
    
    // Invite page
    youveBeenInvited: "You've been invited!",
    inviteDescription: "has invited you to help track",
    activitiesText: "'s activities",
    acceptInvitation: "Accept Invitation",
    skipInviteForNow: "Skip for now",
    signInToAcceptInvite: "Sign in to accept this invitation",
    redirectingToSignIn: "Redirecting to sign in...",
    joinBabyTracking: "Join Baby Tracking",
    
    // Caregiver management
    parentsCaregiversTitle: "Parents / Caregivers",
    eachCaregiverDescription: "Each caregiver will be able to view and save entries for",
    noCollaboratorsFound: "No collaborators found yet.",
    inviteSomeoneBelow: "Invite someone using the link below!",
    parentFamily: "Parent / Family",
    caregiverNanny: "Caregiver / Nanny",
    inviteByEmail: "Invite by Email",
    enterEmailAddress: "Enter email address",
    copyInviteLink: "Copy Invite Link",
    wellCopyInviteMessage: "We'll copy an invite message for you to send",
    
    // Role types
    parent: "Parent",
    caregiver: "Caregiver",
    grandparent: "Grandparent",
    partner: "Partner",
    
    // Timeline
    showMoreDays: "Show",
    moreDays: "more days",
    showLess: "Show less",
    babyDay: "'s Day",
    babyTracker: "Baby Tracker",
    
    // Activities
    noActivitiesStartAdding: "No activities yet. Start by adding your first activity!",
    
    // Activity timeline text
    drank: "drank",
    nursed: "nursed",
    ate: "ate",
    hadSolids: "had solids",
    hadAFeeding: "had a feeding",
    dreamFeed: "dream feed",
    hadAWetDiaper: "had a wet diaper",
    hadAPoopDiaper: "had a poop diaper",
    hadAWetAndPoopDiaper: "had a wet and poop diaper",
    hadADiaperChange: "had a diaper change",
    slept: "slept",
    isSleeping: "is sleeping",
    startedAt: "started at",
    tookANap: "took a nap",
    measured: "measured",
    measurementsTaken: "measurements taken",
    tall: "tall",
    head: "head",
    photo: "Photo",
    minTotal: "min total",
    
    // Feed types
    bottle: "Bottle",
    nursing: "Nursing",
    solid: "Solid",
    
    // Diaper types
    wet: "Wet",
    poopy: "Poopy",
    both: "Both",
    
    // Trend chart
    dailyFeedTotals: "Daily Feed Totals",
    dailySleepTotalsChart: "Daily Sleep Totals",
    feedVolume: "Feed Volume",
    sleepHours: "Sleep Hours",
    feeds: "feeds",
    naps: "naps",
    noFeeds: "No feeds",
    noNaps: "No naps",
    
    // Pattern insights
    keepLoggingActivities: "Keep logging activities to discover patterns in your baby's routine.",
    insightsAppearAfter: "Insights appear after logging multiple activities of the same type.",
    supportingData: "Supporting Data",
    activity: "Activity",
    patternsBasedOnRecent: "These patterns are based on your recent activities. The more you track, the more accurate they become!",
    highConfidence: "High confidence",
    mediumConfidence: "Medium confidence",
    lowConfidence: "Low confidence",
    confidence: "confidence",
    
    // Huckleberry schedule card
    whatToExpectAt: "What to Expect at",
    weeks: "Weeks",
    newborn: "Newborn",
    youngInfant: "Young Infant",
    olderInfant: "Older Infant",
    mobileInfant: "Mobile Infant",
    toddler: "Toddler",
    stage: "Stage",
    expectedNaps: "Expected Naps",
    perDay: "per day",
    totalSleepNeed: "Total Sleep Need",
    frequency: "Frequency",
    amountPerFeed: "Amount per Feed",
    dailyTotal: "Daily Total",
    developmentFocus: "Development Focus",
    devFocus0to4: "Focus on establishing feeding routines and lots of skin-to-skin contact. Sleep is irregular but will gradually improve.",
    devFocus4to12: "Baby is developing more predictable patterns. Tummy time becomes important for neck and shoulder strength.",
    devFocus12to26: "Sleep patterns are becoming more consolidated. Baby may start showing interest in toys and faces.",
    devFocus26to52: "Baby is becoming more mobile and curious. Sleep may be disrupted by developmental leaps.",
    devFocus52plus: "Your little one is becoming more independent. Routine and consistency remain important.",
    
    // Tab names
    patterns: "Patterns",
    helper: "Helper",
    
    // Age display
    daysOld: "days old",
    monthOld: "month old",
    monthsOld: "months old",
    yearOld: "year old",
    yearsOld: "years old",
    
    // Add activity modal
    addActivity: "Add Activity",
    editActivity: "Edit Activity",
    sleep: "Sleep",
    measure: "Measure",
    tapToEnterAmount: "Tap to enter amount",
    nursingTime: "Nursing Time",
    leftSide: "Left Side (min)",
    rightSide: "Right Side (min)",
    whatDidTheyEat: "What did they eat?",
    notes: "Notes",
    additionalNotesFeeding: "Additional notes about feeding...",
    includeEndTime: "Include end time",
    endTime: "End Time",
    noteText: "Note",
    enterNoteHere: "Enter your note here...",
    photoOptional: "Photo (optional)",
    selectedPhoto: "Selected photo",
    remove: "Remove",
    changePhoto: "Change photo",
    tapToAddPhoto: "Tap to add photo",
    jpgPngUpTo10mb: "JPG, PNG up to 10MB",
    weight: "Weight",
    pounds: "Pounds",
    ounces: "Ounces",
    heightInches: "Height (inches)",
    headCircumferenceInches: "Head Circumference (inches)",
    doctorVisitGrowthCheck: "Doctor visit, growth check...",
    leak: "Leak",
    diaperingCream: "Diapering Cream",
    additionalNotesDiaper: "Additional notes about diaper change..."
  },
  zh: {
    // App name and core  
    appName: "宝宝追踪器",
    welcome: "欢迎回来",
    
    // Authentication
    signIn: "登录",
    signUp: "注册",
    email: "邮箱",
    password: "密码", 
    fullName: "姓名",
    enterEmail: "输入您的邮箱",
    enterPassword: "输入密码",
    createAccount: "创建账户",
    signInWithGoogle: "使用Google登录",
    tagline: "记录宝宝珍贵的每一刻",
    
    // Main app
    todaysActivities: "今日活动",
    noActivitiesYet: "今天还没有活动记录",
    tapToAddFirst: "点击+按钮添加第一个活动",
    
    // Navigation
    home: "首页",
    insights: "洞察",
    trends: "趋势",
    calendar: "日历",
    profile: "个人资料",
    settings: "设置",
    
    // Baby profile
    babyName: "宝宝姓名",
    babyBirthday: "宝宝生日",
    setupProfile: "让我们设置宝宝的资料",
    
    // Activities
    feeding: "喂养",
    diaper: "尿布",
    nap: "睡觉",
    note: "笔记",
    startTime: "开始时间",
    duration: "持续时间",
    amount: "数量",
    type: "类型",
    
    // Profile
    language: "语言",
    theme: "主题",
    signOut: "退出登录",
    continue: "继续",
    
    // Onboarding
    welcomeToApp: "与您的宝宝保持同步",
    simplestWay: "追踪宝宝日常活动和模式的最简单方法。",
    trackEverything: "记录所有活动",
    logFeeds: "只需几次点击即可记录喂养、换尿布、睡觉和笔记。",
    shareWithCaregivers: "与照护者分享",
    invitePartners: "邀请伴侣和保姆了解宝宝的活动情况。",
    getStarted: "开始使用",
    
    // Common actions
    add: "添加",
    edit: "编辑",
    delete: "删除",
    save: "保存",
    cancel: "取消",
    
    // Auth page
    signInToAccount: "登录您的账户或创建新账户",
    orContinueWith: "或继续使用",
    yourDataWontBeSaved: "您的数据不会在设备间保存",
    
    // Baby setup
    personalizeExperience: "让我们个性化您的追踪体验",
    
    birthday: "生日",
    selectBirthdate: "选择出生日期",
    
    // Average daily
    avgDailyFeeds: "日均喂养",
    avgDailyDiapers: "日均尿布",
    
    // Settings page
    profileSettings: "个人设置",
    usingAs: "当前身份：",
    signInToSave: "登录以在设备间保存您的数据",
    changePassword: "更改密码",
    passwordChangeEmailSent: "密码更改邮件已发送",
    checkEmailForInstructions: "请查看您的邮箱以获取密码更改说明。",
    errorSendingEmail: "发送邮件出错",
    failedToSendEmail: "发送密码更改邮件失败。请重试。",
    switchAppLanguage: "切换应用语言",
    babyDetails: "宝宝详情",
    babyInfoSavedLocally: "宝宝信息仅本地保存。登录以在设备间同步。",
    enterBabyName: "输入宝宝姓名",
    inviteCaretakers: "邀请看护者",
    shareTrackingWith: "与家人和照护者分享追踪",
    shareInviteLink: "分享邀请链接",
    signInToShare: "登录以分享",
    linkCopied: "链接已复制！",
    manageCaregivers: "管理看护者",
    caregivers: "看护者",
    inviteShared: "邀请已分享！",
    shareDialogOpened: "分享对话框已成功打开。",
    inviteLinkCopied: "邀请链接已复制！",
    shareWithPartner: "将此链接分享给您的伴侣或看护者。",
    failedToCreateInvite: "创建邀请失败",
    pleaseRetryInvite: "请重试。",
    profileUpdated: "个人资料已更新",
    nameHasBeenSaved: "您的姓名已保存。",
    errorUpdatingProfile: "更新个人资料出错",
    failedToUpdateProfile: "更新个人资料失败。请重试。",
    roleUpdated: "角色已更新",
    roleChangedTo: "您的角色已更改为",
    errorUpdatingRole: "更新角色出错",
    failedToUpdateRole: "更新角色失败。请重试。",
    failedToSaveBabyName: "保存宝宝姓名失败",
    failedToUpdateBabyName: "更新宝宝姓名失败",
    failedToSaveName: "保存姓名失败",
    appPreferences: "应用偏好",
    account: "账户",
    done: "完成",
    currentCaregivers: "当前看护者",
    selectBirthday: "选择生日",
    youAre: "您是",
    
    // Time-related
    today: "今天",
    yesterday: "昨天",
    tomorrow: "明天",
    
    // Chart and insights
    nextPredictedAction: "下一个预测活动",
    patternInsights: "模式洞察",
    dailySleepTotals: "每日睡眠总计",
    wakeWindows: "清醒时间窗口",
    sleepPatterns: "睡眠模式",
    feedingPatterns: "喂养模式",
    avgDailySleep: "日均睡眠",
    feedingAround: "约在",
    napAround: "约在",
    likelyFeedingWhenWakesUp: "醒来时可能需要喂养",
    mayNeedAnotherNap: "这次睡眠后可能需要再次小睡",
    considerFeeding: "考虑喂养",
    watchForSleepyCues: "注意困倦迹象",
    currentlySleeping: "正在睡觉",
    lastFed: "上次喂养",
    ago: "前",
    awake: "清醒",
    continueCurrentActivity: "继续当前活动",
    
    // Sleep chart
    weeklySleepSchedule: "每周睡眠时间表",
    thisWeek: "本周",
    lastWeek: "上周",
    showFullDay: "显示全天（0点-24点）",
    showCondensed: "显示压缩（6点-21点）",
    sleepOn: "睡眠于",
    sleepSession: "睡眠时段",
    start: "开始",
    end: "结束",
    
    // Day names (abbreviated)
    sun: "周日",
    mon: "周一",
    tue: "周二",
    wed: "周三",
    thu: "周四",
    fri: "周五",
    sat: "周六",
    
    // Pattern insights generated text
    usuallyFeedsEvery: "通常每隔",
    feedsEvery: "每隔",
    feedingTimesVary: "喂养时间不定 - 食欲增长中？",
    napsBeforeNoon: "次小睡在中午前",
    napsAfterLunch: "次小睡在午后",
    yourBabyStaysAwake: "宝宝保持清醒",
    betweenNaps: "在小睡之间",
    bedtimeTrending: "就寝时间趋势",
    nowAround: "- 现在约",
    consistentBedtime: "稳定的就寝常规",
    averageBedtime: "本周平均就寝时间",
    moreFeeds: "更多喂养",
    onWeekends: "在周末",
    lessFeeds: "更少喂养",
    morningFeeder: "早晨喂养者",
    eveningFeeder: "晚间喂养者",
    wakeWindow: "清醒时间",
    
    // Insight descriptions
    basedOnIntervals: "基于 {count} 次喂养间隔，喂养之间的平均时间为 {hours} 小时。",
    highlyPredictable: "高度可预测的喂养模式，与 {hours}小时平均值仅有 {minutes} 分钟差异。",
    feedingIntervalsVary: "喂养间隔平均变化 {minutes} 分钟，这可能表明成长突增或需求变化。",
    strongMorningNap: "检测到强烈的早晨小睡模式。{morning} / {total} 次小睡发生在中午12点前。",
    afternoonSleepPreference: "发现午后睡眠偏好。{afternoon} / {total} 次小睡发生在下午12-6点之间。",
    wakeWindowPattern: "基于过去一周的 {count} 个清醒时间窗口，您的宝宝通常在小睡之间保持清醒 {time}。此模式有助于预测最佳小睡时间。",
    bedtimeOver: "在过去 {days} 天，就寝时间趋势 {direction}。当前平均为 {time}，比本周早些时候 {direction} {minutes} 分钟。",
    consistentBedtimeDesc: "您的宝宝在 {time} 左右有稳定的就寝时间。这种稳定的常规有利于健康的睡眠模式。",
    avgBedtimeDesc: "基于最近 {days} 天，您宝宝的平均就寝时间在 {time} 左右。继续追踪以发现模式。",
    weekendFeedsDesc: "周末喂养模式与工作日不同。周末平均 {weekend} 次喂养，工作日 {weekday} 次。",
    later: "推迟",
    earlier: "提前",
    
    // Feeding guidance notes
    newbornsFeedFrequent: "新生儿需要频繁的小量喂养。遵循宝宝的饥饿信号。",
    feedingPatternsBecoming: "喂养模式变得更加可预测。",
    babyCanGoLonger: "宝宝现在可以在两次喂养之间间隔更长时间。",
    sleepPeriodsLonger: "睡眠时间变长，影响喂养时间表。",
    mayStartSolids: "4-6个月大时可能开始对固体食物表现出兴趣。",
    solidsBecomingBigger: "固体食物正成为营养的更大部分。",
    
    // Invite page
    youveBeenInvited: "您受到邀请！",
    inviteDescription: "邀请您帮助追踪",
    activitiesText: "的活动",
    acceptInvitation: "接受邀请",
    skipInviteForNow: "暂时跳过",
    signInToAcceptInvite: "登录以接受此邀请",
    redirectingToSignIn: "正在重定向到登录...",
    joinBabyTracking: "加入宝宝追踪",
    
    // Caregiver management
    parentsCaregiversTitle: "父母 / 看护者",
    eachCaregiverDescription: "每位看护者都能查看和保存",
    noCollaboratorsFound: "尚未找到协作者。",
    inviteSomeoneBelow: "使用下面的链接邀请某人！",
    parentFamily: "父母 / 家庭",
    caregiverNanny: "看护者 / 保姆",
    inviteByEmail: "通过邮箱邀请",
    enterEmailAddress: "输入邮箱地址",
    copyInviteLink: "复制邀请链接",
    wellCopyInviteMessage: "我们将为您复制邀请消息以发送",
    
    // Role types
    parent: "父母",
    caregiver: "看护者",
    grandparent: "祖父母",
    partner: "伴侣",
    
    // Timeline
    showMoreDays: "显示",
    moreDays: "更多天",
    showLess: "显示更少",
    babyDay: "的一天",
    babyTracker: "宝宝追踪",
    
    // Activities
    noActivitiesStartAdding: "还没有活动记录。从添加第一个活动开始吧！",
    
    // Activity timeline text
    drank: "喝了",
    nursed: "哺乳",
    ate: "吃了",
    hadSolids: "吃了固体食物",
    hadAFeeding: "进行了喂养",
    dreamFeed: "梦中喂养",
    hadAWetDiaper: "换了湿尿布",
    hadAPoopDiaper: "换了大便尿布",
    hadAWetAndPoopDiaper: "换了大小便尿布",
    hadADiaperChange: "换了尿布",
    slept: "睡了",
    isSleeping: "正在睡觉",
    startedAt: "开始于",
    tookANap: "小睡了一会",
    measured: "测量",
    measurementsTaken: "已测量",
    tall: "高",
    head: "头围",
    photo: "照片",
    minTotal: "分钟总计",
    
    // Feed types
    bottle: "奶瓶",
    nursing: "母乳喂养",
    solid: "固体食物",
    
    // Diaper types
    wet: "湿",
    poopy: "大便",
    both: "大小便",
    
    // Trend chart
    dailyFeedTotals: "每日喂养总计",
    dailySleepTotalsChart: "每日睡眠总计",
    feedVolume: "喂养量",
    sleepHours: "睡眠小时",
    feeds: "次喂养",
    naps: "次小睡",
    noFeeds: "无喂养",
    noNaps: "无小睡",
    
    // Pattern insights
    keepLoggingActivities: "继续记录活动以发现宝宝日常的模式。",
    insightsAppearAfter: "记录多个相同类型的活动后会出现洞察。",
    supportingData: "支持数据",
    activity: "活动",
    patternsBasedOnRecent: "这些模式基于您最近的活动。追踪得越多，就越准确！",
    highConfidence: "高置信度",
    mediumConfidence: "中等置信度",
    lowConfidence: "低置信度",
    confidence: "置信度",
    
    // Huckleberry schedule card
    whatToExpectAt: "在",
    weeks: "周时的预期",
    newborn: "新生儿",
    youngInfant: "小婴儿",
    olderInfant: "大婴儿",
    mobileInfant: "活跃婴儿",
    toddler: "幼儿",
    stage: "阶段",
    expectedNaps: "预期小睡",
    perDay: "每天",
    totalSleepNeed: "总睡眠需求",
    frequency: "频率",
    amountPerFeed: "每次喂养量",
    dailyTotal: "每日总计",
    developmentFocus: "发育重点",
    devFocus0to4: "专注于建立喂养常规和大量的皮肤接触。睡眠不规律但会逐渐改善。",
    devFocus4to12: "宝宝正在形成更可预测的模式。趴时间对颈部和肩部力量发育变得重要。",
    devFocus12to26: "睡眠模式变得更加巩固。宝宝可能开始对玩具和面孔表现出兴趣。",
    devFocus26to52: "宝宝变得更加活跃和好奇。发育飞跃可能会扰乱睡眠。",
    devFocus52plus: "您的小家伙正在变得更加独立。常规和一致性仍然很重要。",
    
    // Tab names
    patterns: "模式",
    helper: "助手",
    
    // Age display
    daysOld: "天大",
    monthOld: "个月大",
    monthsOld: "个月大",
    yearOld: "岁",
    yearsOld: "岁",
    
    // Add activity modal
    addActivity: "添加活动",
    editActivity: "编辑活动",
    sleep: "睡觉",
    measure: "测量",
    tapToEnterAmount: "点击输入数量",
    nursingTime: "哺乳时间",
    leftSide: "左侧（分钟）",
    rightSide: "右侧（分钟）",
    whatDidTheyEat: "他们吃了什么？",
    notes: "笔记",
    additionalNotesFeeding: "关于喂养的额外笔记...",
    includeEndTime: "包含结束时间",
    endTime: "结束时间",
    noteText: "笔记",
    enterNoteHere: "在此输入您的笔记...",
    photoOptional: "照片（可选）",
    selectedPhoto: "已选照片",
    remove: "移除",
    changePhoto: "更换照片",
    tapToAddPhoto: "点击添加照片",
    jpgPngUpTo10mb: "JPG、PNG，最大10MB",
    weight: "体重",
    pounds: "磅",
    ounces: "盎司",
    heightInches: "身高（英寸）",
    headCircumferenceInches: "头围（英寸）",
    doctorVisitGrowthCheck: "医生访问、成长检查...",
    leak: "漏尿",
    diaperingCream: "护臀膏",
    additionalNotesDiaper: "关于换尿布的额外笔记..."
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'zh' || saved === 'en') ? saved : 'en';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}