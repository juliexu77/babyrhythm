import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Square, Loader2, Check, X, Pencil } from 'lucide-react';
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (e) {
          console.log('Recognition cleanup:', e);
        }
      }
    };
  }, [autoStart]);

  const releaseRecognition = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      // Detach handlers and aggressively stop to release the mic across browsers
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch (e) {
        console.log('Stop recognition error:', e);
      }
      try {
        if (typeof rec.abort === 'function') rec.abort();
      } catch (e) {
        console.log('Abort recognition error:', e);
      }
    } finally {
      recognitionRef.current = null;
    }
  };

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
        // Ensure microphone is fully released immediately after we have results
        releaseRecognition();
        setIsProcessing(true);
        await processTranscript(transcriptText);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        releaseRecognition();
        toast({
          title: 'Recording Error',
          description: 'Could not recognize speech. Please try again.',
          variant: 'destructive',
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        // Some browsers keep the mic active after onend unless we abort
        releaseRecognition();
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
    if (recognitionRef.current) {
      releaseRecognition();
    }
    setIsRecording(false);
  };

  const processTranscript = async (transcript: string) => {
    try {
      // Send transcript to edge function for parsing
      const { data, error } = await supabase.functions.invoke('voice-activity', {
        body: { transcript }
      });

      console.log('Voice activity response:', { data, error, transcript });

      if (error) throw error;

      if (data?.activities && data.activities.length > 0) {
        console.log('Parsed activities:', data.activities);
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
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setParsedActivities([]);
    setTranscript("");
    setEditingIndex(null);
  };

  const handleRemoveActivity = (index: number) => {
    setParsedActivities(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditActivity = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number, updatedActivity: any) => {
    setParsedActivities(prev => prev.map((activity, i) => 
      i === index ? updatedActivity : activity
    ));
    setEditingIndex(null);
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
    <div className="flex flex-col items-center gap-4" data-voice-recorder>
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
                    {editingIndex === index ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={formatActivityPreview(activity)}
                          className="w-full px-2 py-1 text-sm border rounded"
                          placeholder="Edit activity..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setEditingIndex(null)}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(index, activity)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  
                  {editingIndex !== index && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditActivity(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveActivity(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel All
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Confirm & Log All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
