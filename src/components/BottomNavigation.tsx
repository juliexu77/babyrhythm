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
    { id: "home", label: "TODAY", icon: Home },
    { id: "trends", label: "TRENDS", icon: TrendingUp },
    { id: "record", label: "RECORD", icon: Plus, isRecord: true },
    { id: "rhythm", label: "GUIDE", icon: Activity },
    { id: "history", label: "HISTORY", icon: List },
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === "record") {
      onAddActivity();
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
      <div className="max-w-md mx-auto px-2">
        <div className="grid grid-cols-5 items-center h-16">
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
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon 
                  className="w-6 h-6 mb-0.5" 
                  strokeWidth={tab.isRecord ? 2.5 : isActive ? 2.5 : 2}
                />
                <span className="text-[10px] font-semibold tracking-caps">{tab.label}</span>
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
