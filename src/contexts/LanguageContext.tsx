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
    continue: "Continue"
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
    continue: "继续"
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