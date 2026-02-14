import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, Check, X, Volume2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface VoiceRecorderProps {
  onTranscription: (data: {
    text: string;
    parsedSymptoms: string[];
    parsedMood: string;
    parsedNotes: string;
  }) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

export default function VoiceRecorder({ onTranscription, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(Math.min(avg / 128, 1));
    animFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        audioContext.close();
        setAudioLevel(0);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 1000) {
          setState("error");
          setErrorMsg("Recording too short. Please hold the button and speak for at least 2 seconds.");
          return;
        }

        setState("processing");
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Transcription failed");
          }

          const data = await res.json();
          setState("done");
          onTranscription(data);

          setTimeout(() => setState("idle"), 2000);
        } catch (err: any) {
          setState("error");
          setErrorMsg(err.message || "Failed to transcribe audio");
        }
      };

      mediaRecorder.start(100);
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
      updateAudioLevel();
    } catch (err: any) {
      setState("error");
      if (err.name === "NotAllowedError") {
        setErrorMsg("Microphone access denied. Please allow microphone permissions in your browser settings.");
      } else {
        setErrorMsg("Could not access microphone. Please check your device settings.");
      }
    }
  }, [onTranscription, updateAudioLevel]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const pulseScale = 1 + audioLevel * 0.15;

  return (
    <div className="flex flex-col items-center gap-3" data-testid="voice-recorder">
      {state === "idle" && (
        <Button
          onClick={startRecording}
          disabled={disabled}
          variant="outline"
          className="w-full gap-2"
          data-testid="button-start-recording"
        >
          <Mic className="w-4 h-4" />
          Speak Your Symptoms
        </Button>
      )}

      {state === "recording" && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-center gap-4">
            <div
              className="relative flex items-center justify-center"
              style={{ transform: `scale(${pulseScale})`, transition: "transform 0.1s ease" }}
            >
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="icon"
                className="relative z-10"
                data-testid="button-stop-recording"
              >
                <MicOff className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-destructive" data-testid="text-recording-time">
                {formatTime(elapsed)}
              </div>
              <div className="text-xs text-muted-foreground">Recording...</div>
            </div>
          </div>

          <div className="flex gap-0.5 h-6 items-end justify-center">
            {Array.from({ length: 20 }).map((_, i) => {
              const barLevel = Math.random() * audioLevel;
              return (
                <div
                  key={i}
                  className="w-1 rounded-full bg-destructive/70 transition-all duration-75"
                  style={{ height: `${Math.max(4, barLevel * 24)}px` }}
                />
              );
            })}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Describe your symptoms, mood, and how you're feeling. Tap the button when done.
          </p>
        </div>
      )}

      {state === "processing" && (
        <div className="w-full flex flex-col items-center gap-2 py-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Transcribing with Minimax AI...</span>
        </div>
      )}

      {state === "done" && (
        <div className="w-full flex items-center justify-center gap-2 py-2 text-sm text-green-600 dark:text-green-400">
          <Check className="w-4 h-4" />
          <span>Symptoms captured from voice</span>
        </div>
      )}

      {state === "error" && (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-destructive">
            <X className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <Button
            onClick={() => setState("idle")}
            variant="outline"
            size="sm"
            className="w-full"
            data-testid="button-retry-recording"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
