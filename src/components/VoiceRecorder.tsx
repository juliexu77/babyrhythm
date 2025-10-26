import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onActivityParsed: (activities: any[]) => void;
  autoStart?: boolean;
}

export const VoiceRecorder = ({ onActivityParsed, autoStart }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedActivities, setParsedActivities] = useState<any[]>([]);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Stops automatically after silence
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      // Most browsers will automatically stop after ~3-5 seconds of silence
    }

    // Auto-start recording if requested
    if (autoStart) {
      setTimeout(() => {
        startRecording();
      }, 300);
    }
  }, [autoStart]);

  const startRecording = async () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Not Supported',
        description: 'Voice recognition is not supported in this browser.',
        variant: 'destructive',
      });
      return;
    }

    try {
      recognitionRef.current.onresult = async (event: any) => {
        const transcriptText = event.results[0][0].transcript;
        setTranscript(transcriptText);
        setIsRecording(false);
        setIsProcessing(true);
        await processTranscript(transcriptText);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast({
          title: 'Recording Error',
          description: 'Could not recognize speech. Please try again.',
          variant: 'destructive',
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not start recording. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const processTranscript = async (transcript: string) => {
    try {
      // Send transcript to edge function for parsing
      const { data, error } = await supabase.functions.invoke('voice-activity', {
        body: { transcript }
      });

      if (error) throw error;

      if (data?.activities && data.activities.length > 0) {
        // Show parsed result for confirmation instead of immediately logging
        setParsedActivities(data.activities);
      } else {
        throw new Error('No activity data returned');
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        title: 'Processing Error',
        description: 'Could not parse voice recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (parsedActivities.length > 0) {
      onActivityParsed(parsedActivities);
      // Reset state
      setParsedActivities([]);
      setTranscript("");
    }
  };

  const handleCancel = () => {
    setParsedActivities([]);
    setTranscript("");
  };

  const formatActivityPreview = (activity: any) => {
    if (!activity) return "";
    
    switch (activity.type) {
      case 'feed':
        if (activity.details.feedType === 'breast') {
          return `Nursed ${activity.details.duration || '?'} min ${activity.details.side || ''}`;
        }
        return `Fed ${activity.details.amount || '?'} ${activity.details.unit || ''} ${activity.details.feedType || ''}`.trim();
      case 'diaper':
        return `${activity.details.type || 'Diaper'} diaper change`;
      case 'nap':
        return `Nap ${activity.details.duration ? `for ${activity.details.duration} minutes` : ''}`;
      case 'wake':
        return `Woke up`;
      case 'note':
        return activity.details.text || 'Note';
      default:
        return 'Activity';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {parsedActivities.length === 0 && (
        <div className="flex items-center justify-center">
          {!isRecording && !isProcessing && (
            <Button
              onClick={startRecording}
              size="lg"
              className="rounded-full w-16 h-16"
              variant="default"
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}
          
          {isRecording && (
            <Button
              onClick={stopRecording}
              size="lg"
              className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90 animate-pulse"
            >
              <Square className="h-6 w-6" />
            </Button>
          )}
          
          {isProcessing && (
            <Button
              size="lg"
              className="rounded-full w-16 h-16"
              disabled
            >
              <Loader2 className="h-6 w-6 animate-spin" />
            </Button>
          )}
        </div>
      )}

      {parsedActivities.length > 0 && (
        <div className="w-full space-y-4">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-2">You said:</p>
            <p className="font-medium mb-4">&ldquo;{transcript}&rdquo;</p>
            
            <p className="text-sm text-muted-foreground mb-2">
              This will log {parsedActivities.length} {parsedActivities.length === 1 ? 'activity' : 'activities'}:
            </p>
            
            <div className="space-y-2">
              {parsedActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <div className="flex-1">
                    <p className="font-semibold">{formatActivityPreview(activity)}</p>
                    {activity.time && (
                      <p className="text-xs text-muted-foreground">
                        at {new Date(activity.time).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Confirm & Log All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
