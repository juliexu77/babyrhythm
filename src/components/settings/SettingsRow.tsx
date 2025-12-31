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
      className={`flex items-center justify-between py-4 min-h-[56px] ${
        isClickable ? 'cursor-pointer active:bg-muted/30 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className="text-foreground/70">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium text-foreground">{title}</div>
          {subtitle && (
            <div className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 flex-shrink-0">
        {children}
        {value && (
          <div className="text-muted-foreground text-[15px]">{value}</div>
        )}
        {isClickable && showChevron && (
          <ChevronRight className="w-5 h-5 text-muted-foreground/60" />
        )}
      </div>
    </div>
  );
};