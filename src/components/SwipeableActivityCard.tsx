import { useRef, useState } from "react";
import { ActivityCard, Activity } from "./ActivityCard";
import { Milestone } from "@/utils/milestoneDetection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SwipeableActivityCardProps {
  activity: Activity;
  babyName?: string;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
  milestones?: Milestone[];
}

export const SwipeableActivityCard = ({
  activity,
  babyName,
  onEdit,
  onDelete,
  milestones = [],
}: SwipeableActivityCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const DELETE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    
    // Only allow left swipe (negative diff)
    const newTranslate = Math.min(0, Math.max(-DELETE_THRESHOLD - 20, currentXRef.current + diff));
    setTranslateX(newTranslate);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // If swiped past threshold, keep it open at threshold position
    if (translateX < -DELETE_THRESHOLD / 2) {
      setTranslateX(-DELETE_THRESHOLD);
    } else {
      setTranslateX(0);
    }
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(activity.id);
    }
    setShowConfirm(false);
    setTranslateX(0);
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
    setTranslateX(0);
  };

  const handleCardClick = (clickedActivity: Activity) => {
    // Only trigger edit if not swiped open
    if (translateX === 0 && onEdit) {
      onEdit(clickedActivity);
    } else {
      // Reset swipe state on tap when open
      setTranslateX(0);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative overflow-hidden">
        {/* Delete button - iOS style, only visible when swiped */}
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-center pr-2"
          style={{ 
            width: DELETE_THRESHOLD,
            opacity: translateX < 0 ? 1 : 0,
            transition: isDragging ? 'none' : 'opacity 0.2s ease-out'
          }}
        >
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-semibold rounded-lg active:opacity-80"
          >
            Delete
          </button>
        </div>

        {/* Swipeable content */}
        <div
          className="relative bg-card"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ActivityCard
            activity={activity}
            babyName={babyName}
            onEdit={handleCardClick}
            onDelete={onDelete}
            milestones={milestones}
          />
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
