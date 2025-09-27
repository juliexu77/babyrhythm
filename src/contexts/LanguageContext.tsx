import { createContext, useContext, useState, ReactNode } from "react";

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation data
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
    babyName: "Baby's name",
    babyBirthday: "Baby's birthday",
    setupProfile: "Let's set up your baby's profile",
    
    // Activities
    feeding: "Feeding",
    diaper: "Diaper",
    nap: "Nap",
    note: "Note",
    startTime: "Start time",
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
    seePatterns: "See Patterns",
    understandRoutines: "Understand your baby's routines and get helpful insights over time.",
    collaborateWith: "Collaborate with Caretakers",
    shareTracking: "Share tracking with anyone you share caregiving responsibilities with, real time sync so you can see all the details even when you're not there",
    getStarted: "Get Started",
    next: "Next",
    back: "Back",
    skip: "Skip",
    
    // Common UI
    comingSoon: "Coming soon",
    loading: "Loading...",
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
    skipForNow: "Skip for now (you can add this later in settings)",
    babyProfile: "Baby Profile",
    useThisInfo: "We'll use this information to personalize your experience",
    settingUp: "Setting up...",
    
    // Average daily
    avgDailyFeeds: "Avg Daily Feeds",
    avgDailyDiapers: "Avg Daily Diapers",
    
    // Settings page
    profileSettings: "Profile & Settings",
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
    shareTrackingWith: "Share tracking with someone so they can view and add activities too.",
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
    failedToSaveName: "Failed to save name"
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
    seePatterns: "查看模式",
    understandRoutines: "了解宝宝的日常规律，并随时间获得有用的见解。",
    collaborateWith: "与看护者协作",
    shareTracking: "与任何与您分享照顾责任的人分享追踪，实时同步，即使您不在现场也能看到所有详细信息",
    getStarted: "开始使用",
    next: "下一步",
    back: "返回",
    skip: "跳过",
    
    // Common UI
    comingSoon: "即将推出",
    loading: "加载中...",
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
    skipForNow: "暂时跳过（您可以稍后在设置中添加）",
    babyProfile: "宝宝资料",
    useThisInfo: "我们将使用此信息来个性化您的体验",
    settingUp: "设置中...",
    
    // Average daily
    avgDailyFeeds: "日均喂养",
    avgDailyDiapers: "日均尿布",
    
    // Settings page
    profileSettings: "个人资料与设置",
    usingAs: "当前身份：",
    signInToSave: "登录以在设备间保存您的数据",
    changePassword: "更改密码",
    passwordChangeEmailSent: "密码更改邮件已发送",
    checkEmailForInstructions: "请查看您的邮箱以获取密码更改说明。",
    errorSendingEmail: "发送邮件出错",
    failedToSendEmail: "发送密码更改邮件失败。请重试。",
    switchAppLanguage: "切换应用语言",
    babyDetails: "宝宝详情",
    babyInfoSavedLocally: "宝宝信息已本地保存。登录以在设备间同步。",
    enterBabyName: "输入宝宝姓名",
    inviteCaretakers: "邀请看护者",
    shareTrackingWith: "与他人分享追踪功能，让他们也能查看和添加活动。",
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
    failedToUpdateRole: "更新您的角色失败。请重试。",
    failedToSaveBabyName: "保存宝宝姓名失败",
    failedToUpdateBabyName: "更新宝宝姓名失败",
    failedToSaveName: "保存姓名失败"
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