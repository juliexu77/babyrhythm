import { ReactNode } from "react";

interface SettingsSectionProps {
  title?: string;
  children: ReactNode;
}

export const SettingsSection = ({ title, children }: SettingsSectionProps) => {
  return (
    <div className="bg-card rounded-strava border border-border overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            {title}
          </h3>
        </div>
      )}
      <div className="divide-y divide-border">
        {children}
      </div>
    </div>
  );
};