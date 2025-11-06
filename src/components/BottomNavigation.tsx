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
    { id: "home", label: t('home'), icon: Home },
    { id: "helper", label: t('guide'), icon: Activity },
  ];
  
  const rightTabs = [
    { id: "trends", label: t('trends'), icon: TrendingUp },
    { id: "insights", label: t('log'), icon: List },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border/50 z-50">
      <div className="max-w-md mx-auto px-4 py-2.5">
        <div className="grid grid-cols-5 gap-2 items-center justify-items-center">
          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const dataTab = tab.id === 'helper' ? 'guide' : tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                data-tab={dataTab}
                className={`flex flex-col items-center space-y-0.5 transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon 
                  className="w-5.5 h-5.5" 
                  fill={isActive && tab.id === 'home' ? 'currentColor' : 'none'}
                  strokeWidth={isActive && tab.id === 'home' ? 0 : 2}
                />
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            );
          })}

          {/* Central Add Button */}
          <div className="flex justify-center">
            <button
              ref={addButtonRef}
              onClick={onAddActivity}
              className="w-11 h-11 bg-primary rounded-full 
                       flex items-center justify-center shadow-lg
                       hover:scale-105 transition-transform duration-200"
            >
              <Plus className="w-[18px] h-[18px] text-primary-foreground" />
            </button>
          </div>

          {/* Right tabs */}
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const dataTab = tab.id === 'insights' ? 'log' : tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                data-tab={dataTab}
                className={`flex flex-col items-center space-y-0.5 transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5.5 h-5.5" />
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};