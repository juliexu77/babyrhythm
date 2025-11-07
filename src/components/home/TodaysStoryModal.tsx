import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity } from "@/components/ActivityCard";
import { format } from "date-fns";
import { Camera, StickyNote, Baby, Moon, Droplet, Ruler, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TodaysStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  babyName?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "feed": return <Baby className="h-4 w-4" />;
    case "diaper": return <Droplet className="h-4 w-4" />;
    case "nap": return <Moon className="h-4 w-4" />;
    case "note": return <StickyNote className="h-4 w-4" />;
    case "measure": return <Ruler className="h-4 w-4" />;
    case "photo": return <Camera className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getActivityLabel = (activity: Activity): string => {
  switch (activity.type) {
    case "feed":
      if (activity.details.feedType === "nursing") {
        return "Nursed";
      } else if (activity.details.feedType === "solid") {
        return "Ate solids";
      } else {
        return `Fed ${activity.details.quantity}${activity.details.unit || "oz"}`;
      }
    case "diaper":
      return `Diaper change (${activity.details.diaperType})`;
    case "nap":
      if (activity.details.startTime && activity.details.endTime) {
        return `Napped ${activity.details.startTime} - ${activity.details.endTime}`;
      }
      return "Nap";
    case "measure":
      return "Growth check";
    case "note":
      return "Note";
    case "photo":
      return "Photo";
    default:
      return activity.type;
  }
};

export function TodaysStoryModal({ isOpen, onClose, activities, babyName }: TodaysStoryModalProps) {
  // Filter today's activities
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayActivities = activities.filter(activity => {
    if (!activity.loggedAt) return false;
    const activityDate = new Date(activity.loggedAt);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === today.getTime();
  });

  // Get photos with notes
  const photosWithNotes = todayActivities.filter(a => 
    a.type === "photo" && (a.details.photoUrl || a.details.note)
  );

  // Get interesting activities (not routine diapers)
  const highlights = todayActivities.filter(a => 
    a.type === "note" || 
    a.type === "measure" ||
    (a.type === "feed" && a.details.feedType === "solid") ||
    (a.type === "nap" && a.details.isNightSleep)
  ).slice(0, 5);

  // Calculate summary stats
  const feedCount = todayActivities.filter(a => a.type === "feed").length;
  const napCount = todayActivities.filter(a => a.type === "nap" && !a.details.isNightSleep).length;
  const diaperCount = todayActivities.filter(a => a.type === "diaper").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <span className="text-2xl">✨</span>
            {babyName ? `${babyName}'s Day` : "Today's Story"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Summary Stats */}
          <div className="flex gap-4 justify-around">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{feedCount}</div>
              <div className="text-xs text-muted-foreground">feeds</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{napCount}</div>
              <div className="text-xs text-muted-foreground">naps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{diaperCount}</div>
              <div className="text-xs text-muted-foreground">diapers</div>
            </div>
          </div>

          {/* Photos Section */}
          {photosWithNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Captured Moments</h3>
              <div className="grid grid-cols-2 gap-3">
                {photosWithNotes.map((activity) => (
                  <Card key={activity.id} className="overflow-hidden">
                    {activity.details.photoUrl && (
                      <div className="aspect-square relative">
                        <img 
                          src={activity.details.photoUrl} 
                          alt="Baby moment" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {activity.details.note && (
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {activity.details.note}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Highlights Section */}
          {highlights.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Today's Highlights</h3>
              <div className="space-y-2">
                {highlights.map((activity) => (
                  <Card key={activity.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {getActivityLabel(activity)}
                        </p>
                        {activity.details.note && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {activity.details.note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {photosWithNotes.length === 0 && highlights.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No photos or special moments captured yet today.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Add photos or notes to build {babyName ? `${babyName}'s` : "your baby's"} daily story!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
