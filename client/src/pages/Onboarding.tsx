import { useState } from "react";
import { Redirect } from "wouter";
import { usePcosProfile, useUpdatePcosProfile } from "@/hooks/use-pcos";
import { AnalysisWizard } from "@/components/AnalysisWizard";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { PcosAnalysisResponse } from "@shared/schema";

export default function Onboarding() {
  const { data: profile, isLoading } = usePcosProfile();
  const updateProfile = useUpdatePcosProfile();
  const [analysisResult, setAnalysisResult] = useState<PcosAnalysisResponse | null>(null);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  // If profile already exists and has a type, redirect to dashboard
  if (profile?.pcosType && !analysisResult) {
    return <Redirect to="/" />;
  }

  const handleAnalysisComplete = (result: PcosAnalysisResponse) => {
    setAnalysisResult(result);
  };

  const handleSaveProfile = () => {
    if (!analysisResult) return;
    
    updateProfile.mutate({
      pcosType: analysisResult.detectedType,
      symptoms: [], // We could store these if needed
      cycleLength: 28, // Default, user can update later
      lastPeriodDate: new Date().toISOString(), // Default to today, user updates later
    }, {
      onSuccess: () => {
        // Will trigger redirect via profile check
        window.location.href = "/"; 
      }
    });
  };

  if (analysisResult) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Analysis Complete</h1>
            <p className="text-muted-foreground">We've identified your potential PCOS profile</p>
          </div>

          <div className="bg-secondary/30 rounded-xl p-8 mb-8 border border-secondary">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detected Type</h2>
            <div className="text-3xl font-display font-bold text-primary mb-4 capitalize">
              {analysisResult.detectedType.replace('_', ' ')} PCOS
            </div>
            <p className="text-foreground/80 leading-relaxed mb-6">
              {analysisResult.explanation}
            </p>
            
            <h3 className="font-semibold mb-3">Key Recommendations:</h3>
            <ul className="space-y-2">
              {analysisResult.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={handleSaveProfile} className="w-full" size="lg" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving Profile..." : "Start My Personalized Journey"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          Let's personalize your care
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Understanding your unique symptoms helps us tailor nutrition, exercise, and lifestyle recommendations just for you.
        </p>
      </div>
      
      <AnalysisWizard onComplete={handleAnalysisComplete} />
    </div>
  );
}
