import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface SettingsRowProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  onClick?: () => void;
  children?: ReactNode;
  showChevron?: boolean;
}

export const SettingsRow = ({ 
  icon, 
  title, 
  subtitle, 
  value, 
  onClick, 
  children,
  showChevron = true 
}: SettingsRowProps) => {
  const isClickable = !!onClick;
  
  return (
    <div 
      className={`flex items-center justify-between py-4 px-4 ${
        isClickable ? 'cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {children}
        {value && (
          <div className="text-muted-foreground text-xs">{value}</div>
        )}
        {isClickable && showChevron && (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};