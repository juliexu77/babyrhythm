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
  
  const leftTabs = [
    { id: "home", label: "HOME", icon: Home },
    { id: "trends", label: "TRENDS", icon: TrendingUp },
  ];
  
  const rightTabs = [
    { id: "rhythm", label: "GUIDE", icon: Activity },
    { id: "history", label: "HISTORY", icon: List },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="max-w-md mx-auto px-2">
        <div className="grid grid-cols-5 items-center h-16">
          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                data-tab={tab.id}
                className={`flex flex-col items-center justify-center h-full transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon 
                  className="w-6 h-6 mb-0.5" 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[10px] font-semibold tracking-caps">{tab.label}</span>
              </button>
            );
          })}

          {/* Central Add Button - Strava style: prominent, circular */}
          <div className="flex justify-center">
            <button
              ref={addButtonRef}
              onClick={onAddActivity}
              className="w-14 h-14 -mt-4 bg-primary rounded-full 
                       flex items-center justify-center shadow-lg
                       hover:scale-105 active:scale-95 transition-transform duration-150"
            >
              <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right tabs */}
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                data-tab={tab.id}
                className={`flex flex-col items-center justify-center h-full transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon 
                  className="w-6 h-6 mb-0.5" 
                  strokeWidth={isActive ? 2.5 : 2}
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
