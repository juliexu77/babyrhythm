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
    { id: "home", label: "Home", icon: Home },
    { id: "trends", label: "Trends", icon: TrendingUp },
  ];
  
  const rightTabs = [
    { id: "rhythm", label: "Guide", icon: Activity },
    { id: "history", label: "History", icon: List },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/60 backdrop-blur-lg border-t border-border/50 z-50">
      <div className="max-w-md mx-auto px-4 py-1.5 pb-4">
        <div className="grid grid-cols-5 gap-2 items-center justify-items-center">
          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                data-tab={tab.id}
                className={`flex flex-col items-center space-y-0.5 transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon 
                  className="w-6 h-6" 
                  fill={isActive && tab.id === 'home' ? 'currentColor' : 'none'}
                  strokeWidth={isActive && tab.id === 'home' ? 0 : 2}
                />
                <span className="text-xs font-serif font-medium">{tab.label}</span>
              </button>
            );
          })}

          {/* Central Add Button */}
          <div className="flex justify-center">
            <button
              ref={addButtonRef}
              onClick={onAddActivity}
              className="w-14 h-14 bg-primary rounded-full 
                       flex items-center justify-center shadow-lg
                       hover:scale-105 transition-transform duration-200"
            >
              <Plus className="w-6 h-6 text-primary-foreground" />
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
                className={`flex flex-col items-center space-y-0.5 transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-serif font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};