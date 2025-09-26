import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity } from "./ActivityCard";
import { Baby, Moon, Palette, StickyNote, Clock, Droplets, Heart, Coffee } from "lucide-react";

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDetailModal = ({ activity, isOpen, onClose }: ActivityDetailModalProps) => {
  if (!activity) return null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "feed": return <Baby className="h-5 w-5" />;
      case "diaper": return <Palette className="h-5 w-5" />;
      case "nap": return <Moon className="h-5 w-5" />;
      case "note": return <StickyNote className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "feed": return "text-pink-600 bg-pink-50";
      case "diaper": return "text-amber-600 bg-amber-50";
      case "nap": return "text-blue-600 bg-blue-50";
      case "note": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
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
                <h3 className="text-lg font-semibold capitalize">{activity.type}</h3>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </div>
            
            {activity.details?.feedType && (
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Type: {activity.details.feedType}</span>
              </div>
            )}
            
            {activity.details?.quantity && activity.details?.unit && (
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Amount: {activity.details.quantity} {activity.details.unit}</span>
              </div>
            )}
            
            {activity.details?.note && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                <p className="text-sm">{activity.details.note}</p>
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
                <h3 className="text-lg font-semibold capitalize">{activity.type} Change</h3>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </div>
            
            {activity.details?.diaperType && (
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Type: {activity.details.diaperType}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Leak: {activity.details?.hasLeak ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Cream: {activity.details?.hasCream ? "Yes" : "No"}</span>
              </div>
            </div>
            
            {activity.details?.note && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                <p className="text-sm">{activity.details.note}</p>
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
                <h3 className="text-lg font-semibold capitalize">{activity.type}</h3>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </div>
            
            {activity.details?.startTime && activity.details?.endTime && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Start: {activity.details.startTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">End: {activity.details.endTime}</span>
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
                <h3 className="text-lg font-semibold capitalize">{activity.type}</h3>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </div>
            
            {activity.details?.note && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm">{activity.details.note}</p>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activity Details</DialogTitle>
        </DialogHeader>
        {renderActivityDetails()}
      </DialogContent>
    </Dialog>
  );
};