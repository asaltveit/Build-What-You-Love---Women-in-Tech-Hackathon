import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalyzePcos } from "@/hooks/use-pcos";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Check, Loader2, ArrowRight, Activity, CalendarDays, UserRound } from "lucide-react";
import type { PcosAnalysisRequest, PcosAnalysisResponse } from "@shared/schema";

interface AnalysisWizardProps {
  onComplete: (result: PcosAnalysisResponse) => void;
}

export function AnalysisWizard({ onComplete }: AnalysisWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<PcosAnalysisRequest>>({
    symptoms: [],
    cycleRegularity: undefined,
    weightConcerns: false,
    hairGrowth: false,
    acne: false,
    fatigue: false,
  });

  const analyze = useAnalyzePcos();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Submit
      analyze.mutate(formData as PcosAnalysisRequest, {
        onSuccess: (data) => onComplete(data),
      });
    }
  };

  const toggleSymptom = (symptom: string) => {
    const current = formData.symptoms || [];
    const updated = current.includes(symptom)
      ? current.filter(s => s !== symptom)
      : [...current, symptom];
    setFormData({ ...formData, symptoms: updated });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8 flex justify-center gap-3">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i <= step ? "w-8 bg-primary" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold">Let's understand your symptoms</h2>
              <p className="text-muted-foreground">Select all that apply to you</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                "Irregular Periods", "Weight Gain", "Acne", "Hair Loss", 
                "Excess Hair Growth", "Fatigue", "Mood Swings", "Sleep Issues",
                "Sugar Cravings", "Bloating"
              ].map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`
                    p-4 rounded-xl text-left transition-all border
                    ${(formData.symptoms || []).includes(symptom)
                      ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/50"
                    }
                  `}
                >
                  <span className="font-medium">{symptom}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold">How is your cycle?</h2>
              <p className="text-muted-foreground">This helps us identify patterns</p>
            </div>

            <div className="space-y-4">
              {[
                { val: "regular", label: "Regular", desc: "Every 21-35 days like clockwork" },
                { val: "irregular", label: "Irregular", desc: "Varies significantly or is unpredictable" },
                { val: "absent", label: "Absent", desc: "Fewer than 3 periods per year" },
              ].map((option) => (
                <button
                  key={option.val}
                  onClick={() => setFormData({ ...formData, cycleRegularity: option.val as any })}
                  className={`
                    w-full p-6 rounded-xl text-left transition-all border flex items-center gap-4
                    ${formData.cycleRegularity === option.val
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/50"
                    }
                  `}
                >
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${formData.cycleRegularity === option.val ? "border-primary" : "border-muted-foreground"}
                  `}>
                    {formData.cycleRegularity === option.val && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{option.label}</h3>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold">A few physical signs</h2>
              <p className="text-muted-foreground">These are key indicators for PCOS types</p>
            </div>

            <div className="space-y-4">
              {[
                { key: "weightConcerns", label: "Weight management struggles", icon: Activity },
                { key: "hairGrowth", label: "Unwanted hair growth (Hirsutism)", icon: UserRound },
                { key: "acne", label: "Persistent acne or skin issues", icon: UserRound },
                { key: "fatigue", label: "Chronic fatigue or energy crashes", icon: Activity },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormData({ ...formData, [item.key]: true })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        // @ts-ignore
                        formData[item.key] === true 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, [item.key]: false })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        // @ts-ignore
                        formData[item.key] === false
                          ? "bg-muted-foreground text-white" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 pt-6 border-t border-border flex justify-end">
        <Button 
          onClick={handleNext} 
          disabled={step === 2 && !formData.cycleRegularity || analyze.isPending}
          className="w-full md:w-auto px-8"
        >
          {analyze.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              {step === 3 ? "Complete Analysis" : "Next Step"}
              {step !== 3 && <ArrowRight className="ml-2 h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
