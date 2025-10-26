import { useState, useRef } from 'react';
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });

      const base64Audio = (reader.result as string).split(',')[1];

      // Send to edge function
      const { data, error } = await supabase.functions.invoke('voice-activity', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data?.activity) {
        toast({
          title: 'Activity Logged',
          description: `Transcribed: "${data.transcription}"`,
        });
        onActivityParsed(data.activity);
      } else {
        throw new Error('No activity data returned');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: 'Processing Error',
        description: 'Could not process voice recording. Please try again.',
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
