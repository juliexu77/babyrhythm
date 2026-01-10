import { ReactNode } from "react";

interface SettingsSectionProps {
  title?: string;
  children: ReactNode;
}

export const SettingsSection = ({ title, children }: SettingsSectionProps) => {
  return (
    <div>
      {title && (
        <div className="bg-muted/50 px-4 py-2.5 -mx-4">
          <h3 className="text-section-header">
            {title}
          </h3>
        </div>
      )}
      <div className="divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
};