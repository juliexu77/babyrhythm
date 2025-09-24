import { Home, TrendingUp, Calendar, User, Plus } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddActivity: () => void;
}

export const BottomNavigation = ({ activeTab, onTabChange, onAddActivity }: BottomNavigationProps) => {
  const leftTabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "timeline", label: "Timeline", icon: TrendingUp },
  ];
  
  const rightTabs = [
    { id: "trends", label: "Trends", icon: Calendar },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="max-w-md mx-auto px-6 py-4">
        <div className="flex justify-between items-center relative">
          {/* Left tabs */}
          <div className="flex space-x-8">
            {leftTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center space-y-1 transition-colors ${
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Central Add Button */}
          <button
            onClick={onAddActivity}
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-2 
                     w-14 h-14 bg-gradient-primary rounded-full 
                     flex items-center justify-center shadow-soft
                     hover:scale-105 transition-transform duration-200"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>

          {/* Right tabs */}
          <div className="flex space-x-8">
            {rightTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center space-y-1 transition-colors ${
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};