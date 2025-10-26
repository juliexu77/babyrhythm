import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onActivityParsed: (activity: any) => void;
}

export const VoiceRecorder = ({ onActivityParsed }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
    }
  }, []);

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
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        setIsProcessing(true);
        await processTranscript(transcript);
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
        toast({
          title: 'Activity Logged',
          description: `Transcribed: "${transcript}"`,
        });
        onActivityParsed(data.activity);
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

  return (
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
  );
};
