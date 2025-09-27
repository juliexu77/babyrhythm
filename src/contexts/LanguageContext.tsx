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
    continueAsGuest: "Continue as Guest",
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
    welcomeToApp: "Welcome to Baby Tracker",
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
    selectBirthday: "Select birthday",
    settingUp: "Setting up...",
    
    // Average daily
    avgDailyFeeds: "Avg Daily Feeds",
    avgDailyDiapers: "Avg Daily Diapers"
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
    continueAsGuest: "游客继续",
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
    welcomeToApp: "欢迎使用宝宝追踪器",
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
    selectBirthday: "选择生日",
    settingUp: "设置中...",
    
    // Average daily
    avgDailyFeeds: "日均喂养",
    avgDailyDiapers: "日均尿布"
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