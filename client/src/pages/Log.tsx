import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useCreateLog, useLogs } from "@/hooks/use-logs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Mic } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import VoiceRecorder from "@/components/VoiceRecorder";

export default function Log() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mood, setMood] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [energy, setEnergy] = useState(5);
  const [voiceText, setVoiceText] = useState("");

  const { data: logs } = useLogs();
  const createLog = useCreateLog();
  const { toast } = useToast();

  const handleSave = () => {
    if (!date) return;
    
    createLog.mutate({
      date: format(date, "yyyy-MM-dd"),
      cycleDay: 14,
      symptoms,
      mood,
      notes,
      energyLevel: energy
    }, {
      onSuccess: () => {
        toast({ title: "Logged successfully", description: "Your daily log has been saved." });
        setMood("");
        setSymptoms([]);
        setNotes("");
        setVoiceText("");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]);
  };

  const handleVoiceTranscription = (data: {
    text: string;
    parsedSymptoms: string[];
    parsedMood: string;
    parsedNotes: string;
  }) => {
    setVoiceText(data.text);

    if (data.parsedSymptoms.length > 0) {
      setSymptoms(prev => {
        const combined = new Set([...prev, ...data.parsedSymptoms]);
        return Array.from(combined);
      });
    }

    if (data.parsedMood && !mood) {
      setMood(data.parsedMood);
    }

    if (data.parsedNotes) {
      setNotes(prev => prev ? `${prev}\n\n[Voice]: ${data.parsedNotes}` : data.parsedNotes);
    }

    toast({
      title: "Voice input captured",
      description: `Detected ${data.parsedSymptoms.length} symptom(s)${data.parsedMood ? ` and mood: ${data.parsedMood}` : ""}`,
    });
  };

  const symptomOptions = [
    "Cramps", "Headache", "Bloating", "Acne", "Cravings", "Back Pain",
    "Fatigue", "Nausea", "Breast Tenderness", "Mood Swings", "Insomnia",
    "Hot Flashes", "Dizziness", "Joint Pain", "Hair Loss", "Weight Gain",
  ];
  const moodOptions = ["Happy", "Anxious", "Irritable", "Energetic", "Tired", "Calm"];

  const modifiers = {
    logged: (d: Date) => logs?.some(l => l.date === format(d, "yyyy-MM-dd")) || false
  };
  const modifiersStyles = {
    logged: { color: "var(--primary)", fontWeight: "bold", textDecoration: "underline" }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
        
        <div className="space-y-6">
          <div className="mb-4">
            <h1 className="text-3xl font-display font-bold text-foreground">Daily Log</h1>
            <p className="text-muted-foreground">Track patterns to understand your body.</p>
          </div>

          <Card className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-none"
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
          </Card>

          <Card>
            <CardTitle className="mb-4">History</CardTitle>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {logs?.map(log => (
                <div key={log.id} className="flex justify-between items-center gap-2 p-3 rounded-md bg-secondary/20 text-sm flex-wrap">
                  <span className="font-medium">{format(new Date(log.date), "MMM d")}</span>
                  <div className="flex gap-2 flex-wrap">
                    {log.mood && <Badge variant="secondary">{log.mood}</Badge>}
                    <span className="text-muted-foreground">{log.symptoms?.length} symptoms</span>
                  </div>
                </div>
              ))}
              {!logs?.length && <p className="text-sm text-muted-foreground text-center">No logs yet.</p>}
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <div className="flex justify-between items-center gap-2 mb-6 flex-wrap">
            <CardTitle>{date ? format(date, "MMMM do") : "Select a date"}</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Mic className="w-3 h-3 mr-1" /> Voice Enabled
            </Badge>
          </div>

          <div className="space-y-6">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Mic className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Voice Input</span>
                <Badge variant="secondary" className="text-xs">Minimax AI</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Tap the button below and describe your symptoms naturally. For example: 
                "I'm feeling tired today with some cramps and bloating. My mood is anxious."
              </p>
              <VoiceRecorder onTranscription={handleVoiceTranscription} />
              {voiceText && (
                <div className="mt-3 p-2 rounded-md bg-background border text-xs text-muted-foreground" data-testid="text-voice-transcription">
                  <span className="font-medium text-foreground">Transcribed: </span>
                  {voiceText}
                </div>
              )}
            </Card>

            <div>
              <label className="text-sm font-medium mb-2 block">Mood</label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map(m => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    data-testid={`button-mood-${m.toLowerCase()}`}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      mood === m 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Symptoms
                {symptoms.length > 0 && (
                  <span className="text-xs text-primary ml-2">({symptoms.length} selected)</span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {symptomOptions.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    data-testid={`button-symptom-${s.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`px-3 py-2 rounded-md text-sm text-left transition-all border ${
                      symptoms.includes(s)
                        ? "border-primary bg-primary/5 text-primary font-medium" 
                        : "border-border"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-medium mb-2 flex-wrap gap-1">
                <label>Energy Level</label>
                <span className="text-primary font-bold">{energy}/10</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-secondary rounded-md appearance-none cursor-pointer"
                data-testid="input-energy-level"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="How are you feeling today?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-notes"
              />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={createLog.isPending} data-testid="button-save-log">
              {createLog.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />}
              Save Log
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
