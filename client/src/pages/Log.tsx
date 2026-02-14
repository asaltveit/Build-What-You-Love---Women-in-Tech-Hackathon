import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useCreateLog, useLogs } from "@/hooks/use-logs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

export default function Log() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mood, setMood] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [energy, setEnergy] = useState(5);

  const { data: logs } = useLogs();
  const createLog = useCreateLog();
  const { toast } = useToast();

  const handleSave = () => {
    if (!date) return;
    
    createLog.mutate({
      date: format(date, "yyyy-MM-dd"),
      cycleDay: 14, // Needs real calculation based on user profile
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
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]);
  };

  const symptomOptions = ["Cramps", "Headache", "Bloating", "Acne", "Cravings", "Back Pain"];
  const moodOptions = ["Happy", "Anxious", "Irritable", "Energetic", "Tired", "Calm"];

  // Highlight days with logs
  const modifiers = {
    logged: (d: Date) => logs?.some(l => l.date === format(d, "yyyy-MM-dd")) || false
  };
  const modifiersStyles = {
    logged: { color: "var(--primary)", fontWeight: "bold", textDecoration: "underline" }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
        
        {/* Left Col: Calendar */}
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

          {/* Past Log Preview */}
          <Card>
            <CardTitle className="mb-4">History</CardTitle>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {logs?.map(log => (
                <div key={log.id} className="flex justify-between items-center p-3 rounded-lg bg-secondary/20 text-sm">
                  <span className="font-medium">{format(new Date(log.date), "MMM d")}</span>
                  <div className="flex gap-2">
                    {log.mood && <span className="bg-white px-2 py-0.5 rounded shadow-sm">{log.mood}</span>}
                    <span className="text-muted-foreground">{log.symptoms?.length} symptoms</span>
                  </div>
                </div>
              ))}
              {!logs?.length && <p className="text-sm text-muted-foreground text-center">No logs yet.</p>}
            </div>
          </Card>
        </div>

        {/* Right Col: Form */}
        <Card className="h-fit">
          <div className="flex justify-between items-center mb-6">
            <CardTitle>{date ? format(date, "MMMM do") : "Select a date"}</CardTitle>
            <span className="text-xs text-muted-foreground">Cycle Day 14</span>
          </div>

          <div className="space-y-6">
            {/* Mood */}
            <div>
              <label className="text-sm font-medium mb-2 block">Mood</label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map(m => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      mood === m 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "bg-secondary hover:bg-secondary/70 text-secondary-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <label className="text-sm font-medium mb-2 block">Symptoms</label>
              <div className="grid grid-cols-2 gap-2">
                {symptomOptions.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-all border ${
                      symptoms.includes(s)
                        ? "border-primary bg-primary/5 text-primary font-medium" 
                        : "border-border hover:bg-secondary/30"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Slider */}
            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <label>Energy Level</label>
                <span className="text-primary font-bold">{energy}/10</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="How are you feeling today?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white"
              />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={createLog.isPending}>
              {createLog.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />}
              Save Log
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
