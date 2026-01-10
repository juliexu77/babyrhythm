import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity } from "./ActivityCard";
import { Baby, Moon, Droplet, StickyNote, Clock, Droplets, Heart, Milk } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDetailModal = ({ activity, isOpen, onClose }: ActivityDetailModalProps) => {
  const { t } = useLanguage();
  if (!activity) return null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "feed": return <Baby className="h-5 w-5" />;
      case "diaper": return <Droplet className="h-5 w-5" />;
      case "nap": return <Moon className="h-5 w-5" />;
      case "note": return <StickyNote className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "feed": return "text-primary bg-primary/10";
      case "diaper": return "text-accent-foreground bg-accent/50";
      case "nap": return "text-primary bg-primary/10";
      case "note": return "text-muted-foreground bg-muted";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const renderActivityDetails = () => {
    switch (activity.type) {
      case "feed":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-lg ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div>
                <h3 className="text-lg text-strong capitalize">{activity.type}</h3>
                <p className="text-body-muted">{activity.time}</p>
              </div>
            </div>
            
            {activity.details?.feedType && (
              <div className="flex items-center gap-2">
                <Milk className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('typeLabel')}: {activity.details.feedType}</span>
              </div>
            )}
            
            {activity.details?.quantity && activity.details?.unit && (
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm break-words">{t('amount')}: {activity.details.quantity} {activity.details.unit}</span>
              </div>
            )}
            
            {activity.details?.note && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">{t('notesLabel')}:</p>
                <p className="text-sm break-words whitespace-pre-wrap">{activity.details.note}</p>
              </div>
            )}
          </div>
        );
        
      case "diaper":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-lg ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div>
                <h3 className="text-lg text-strong capitalize">{activity.type} {t('change')}</h3>
                <p className="text-body-muted">{activity.time}</p>
              </div>
            </div>
            
            {activity.details?.diaperType && (
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('typeLabel')}: {activity.details.diaperType}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">{t('leak')}: {activity.details?.hasLeak ? t('yes') : t('no')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{t('diaperingCream')}: {activity.details?.hasCream ? t('yes') : t('no')}</span>
              </div>
            </div>
            
            {activity.details?.note && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">{t('notesLabel')}:</p>
                <p className="text-sm break-words whitespace-pre-wrap">{activity.details.note}</p>
              </div>
            )}
          </div>
        );
        
      case "nap":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-lg ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div>
                <h3 className="text-lg text-strong capitalize">{activity.type}</h3>
                <p className="text-body-muted">{activity.time}</p>
              </div>
            </div>
            
            {activity.details?.startTime && activity.details?.endTime && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('start')}: {activity.details.startTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('end')}: {activity.details.endTime}</span>
                </div>
              </div>
            )}
          </div>
        );
        
      case "note":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-lg ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div>
                <h3 className="text-lg text-strong capitalize">{activity.type}</h3>
                <p className="text-body-muted">{activity.time}</p>
              </div>
            </div>
            
            {activity.details?.note && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm break-words whitespace-pre-wrap">{activity.details.note}</p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md [&>button[data-state]]:hidden">
        <DialogHeader>
          <DialogTitle>{t('activityDetails')}</DialogTitle>
        </DialogHeader>
        {renderActivityDetails()}
      </DialogContent>
    </Dialog>
  );
};