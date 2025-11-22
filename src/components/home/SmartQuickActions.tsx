import { Button } from "@/components/ui/button";
import { MessageCircle, Thermometer } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export interface Activity {
  id: string;
  type: "feed" | "diaper" | "nap" | "note" | "solids" | "photo";
  time: string;
  loggedAt?: string;
  timezone?: string;
  details: any;
}

interface SmartQuickActionsProps {
  suggestions: Array<{
    id: string;
    type: 'nap' | 'feed' | 'wake';
    title: string;
    subtitle: string;
    priority: number;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
  onOpenAddActivity?: (type?: 'feed' | 'nap', prefillActivity?: Activity) => void;
  activities?: Activity[];
  chatComponent?: React.ReactNode;
  addActivity?: (type: string, details?: any, activityDate?: Date, activityTime?: string) => Promise<void>;
}

export const SmartQuickActions = ({
  suggestions,
  onOpenAddActivity,
  activities = [],
  chatComponent,
  addActivity
}: SmartQuickActionsProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSickDayOpen, setIsSickDayOpen] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [sickNote, setSickNote] = useState("");

  // Find the last feed and last nap for prefilling
  const lastFeed = activities
    .filter(a => a.type === 'feed')
    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];
  
  const lastNap = activities
    .filter(a => a.type === 'nap')
    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];

  // Create prefill activities with current time
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const prefillFeed = lastFeed ? {
    ...lastFeed,
    id: '', // Clear ID so it creates a new activity
    time: currentTime,
    loggedAt: now.toISOString(),
    details: {
      ...lastFeed.details,
      startTime: undefined, // Clear time-specific fields
      endTime: undefined,
      displayTime: currentTime
    }
  } : undefined;

  const prefillNap = lastNap ? {
    ...lastNap,
    id: '', // Clear ID so it creates a new activity
    time: currentTime,
    loggedAt: now.toISOString(),
    details: {
      ...lastNap.details,
      startTime: currentTime, // Set start time to now for naps
      endTime: undefined,
      displayTime: currentTime
    }
  } : undefined;

  const symptoms = [
    { id: 'fever', label: 'Fever', icon: '🌡️' },
    { id: 'congested', label: 'Congested', icon: '🤧' },
    { id: 'cough', label: 'Cough', icon: '😷' },
    { id: 'tummy', label: 'Tummy upset', icon: '🤢' },
    { id: 'teething', label: 'Teething', icon: '🦷' },
    { id: 'shots', label: 'Shots', icon: '💉' },
  ];

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleSickDayDone = async () => {
    if (selectedSymptoms.length === 0 && !sickNote.trim()) {
      setIsSickDayOpen(false);
      return;
    }

    const symptomLabels = selectedSymptoms.map(id => 
      symptoms.find(s => s.id === id)?.label
    ).filter(Boolean);

    const noteText = [
      selectedSymptoms.length > 0 ? `Under the weather: ${symptomLabels.join(', ')}` : '',
      sickNote.trim()
    ].filter(Boolean).join('\n');

    try {
      await addActivity?.('note', {
        noteText,
        isSickDay: true,
        symptoms: selectedSymptoms,
        displayTime: currentTime
      });
      
      // Reset form
      setSelectedSymptoms([]);
      setSickNote('');
      setIsSickDayOpen(false);
    } catch (error) {
      console.error('Error logging sick day:', error);
    }
  };

  return (
    <>
      <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-card-ombre-1 to-card-ombre-1-dark shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-border/20 overflow-hidden">
        <div className="px-4 py-5">
          <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAddActivity?.('nap', prefillNap)}
              className="w-full text-sm border-0"
            >
              <span className="mr-2">+</span>
              Log Sleep
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAddActivity?.('feed', prefillFeed)}
              className="w-full text-sm border-0"
            >
              <span className="mr-2">+</span>
              Log Feed
            </Button>
          </div>
          
          <button
            onClick={() => setIsSickDayOpen(true)}
            className="w-full mt-3 px-3 py-2 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors flex items-center justify-center gap-2"
          >
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">Sick day</span>
          </button>

          {chatComponent && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full mt-2 text-center group"
            >
              <span className="text-sm text-primary font-medium underline decoration-2 underline-offset-4 inline-flex items-center gap-1 group-hover:opacity-80 transition-opacity">
                Ask Me Anything →
              </span>
            </button>
          )}
        </div>
      </div>
      
      <Dialog open={isSickDayOpen} onOpenChange={setIsSickDayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Thermometer className="w-5 h-5" />
              Sick day
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {symptoms.map(symptom => (
                <Badge
                  key={symptom.id}
                  variant={selectedSymptoms.includes(symptom.id) ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5 text-sm"
                  onClick={() => toggleSymptom(symptom.id)}
                >
                  <span className="mr-1">{symptom.icon}</span>
                  {symptom.label}
                </Badge>
              ))}
            </div>
            
            <Textarea
              placeholder="Add a note (optional)"
              value={sickNote}
              onChange={(e) => setSickNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            
            <Button 
              onClick={handleSickDayDone} 
              className="w-full"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {chatComponent && (
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
            <DialogHeader className="p-4 pb-3 border-b">
              <DialogTitle>Parenting Coach</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              {chatComponent}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
