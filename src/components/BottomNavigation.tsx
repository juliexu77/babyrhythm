import * as React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Home, Activity, TrendingUp, List, Plus } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddActivity: () => void;
  addButtonRef?: React.Ref<HTMLButtonElement>;
}

export const BottomNavigation = ({ activeTab, onTabChange, onAddActivity, addButtonRef }: BottomNavigationProps) => {
  const { t } = useLanguage();
  
  const tabs = [
    { id: "home", label: "Today", icon: Home },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "record", label: "Record", icon: Plus, isRecord: true },
    { id: "rhythm", label: "Guide", icon: Activity },
    { id: "history", label: "History", icon: List },
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === "record") {
      onAddActivity();
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 z-50">
      <div className="px-2">
        <div className="grid grid-cols-5 items-center h-14">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                ref={tab.isRecord ? addButtonRef : undefined}
                onClick={() => handleTabClick(tab.id)}
                data-tab={tab.id}
                className={`flex flex-col items-center justify-center h-full transition-colors ${
                  tab.isRecord
                    ? "text-primary"
                    : isActive 
                      ? "text-primary" 
                      : "text-muted-foreground/60 hover:text-muted-foreground"
                }`}
              >
                <Icon 
                  className={`w-5 h-5 mb-0.5 ${isActive ? 'fill-current' : ''}`}
                  strokeWidth={isActive ? 2 : 1.5}
                  fill={isActive && !tab.isRecord ? 'currentColor' : 'none'}
                />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </div>
  );
};
