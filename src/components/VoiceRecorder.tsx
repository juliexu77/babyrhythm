import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onActivityParsed: (activity: any) => void;
  autoStart?: boolean;
}

export const VoiceRecorder = ({ onActivityParsed, autoStart }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedActivity, setParsedActivity] = useState<any>(null);
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

      if (data?.activity) {
        // Show parsed result for confirmation instead of immediately logging
        setParsedActivity(data.activity);
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
    if (parsedActivity) {
      onActivityParsed(parsedActivity);
      // Reset state
      setParsedActivity(null);
      setTranscript("");
    }
  };

  const handleCancel = () => {
    setParsedActivity(null);
    setTranscript("");
  };

  const formatActivityPreview = (activity: any) => {
    if (!activity) return "";
    
    switch (activity.type) {
      case 'feed':
        return `Fed ${activity.details.amount || '?'}${activity.details.unit || ''} ${activity.details.feedType || ''}`;
      case 'diaper':
        return `${activity.details.type || 'Diaper'} diaper change`;
      case 'nap':
        return `Nap for ${activity.details.duration || '?'} minutes`;
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
      {!parsedActivity && (
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

      {parsedActivity && (
        <div className="w-full space-y-4">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-2">You said:</p>
            <p className="font-medium mb-4">&ldquo;{transcript}&rdquo;</p>
            
            <p className="text-sm text-muted-foreground mb-2">This will log:</p>
            <p className="text-lg font-semibold">{formatActivityPreview(parsedActivity)}</p>
            
            {parsedActivity.time && (
              <p className="text-sm text-muted-foreground mt-2">
                at {new Date(parsedActivity.time).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Confirm & Log
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
