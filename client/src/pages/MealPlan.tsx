import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChefHat, RefreshCw, ShoppingCart } from "lucide-react";
import { usePcosProfile } from "@/hooks/use-pcos";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import MealPlanCard from "@/components/MealPlanCard";
import ConvexGroceryList from "@/components/ConvexGroceryList";
import "@/styles/bem-components.css";

function getCyclePhase(profile: any): string {
  if (!profile) return "follicular";
  const today = new Date();
  const lastPeriod = new Date(profile.lastPeriodDate);
  const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) % (profile.cycleLength || 28);
  if (diffDays < 5) return "menstrual";
  if (diffDays < 14) return "follicular";
  if (diffDays < 17) return "ovulatory";
  return "luteal";
}

interface MealPlanData {
  breakfast: { name: string; ingredients: string[]; benefits: string; prepTime: string };
  lunch: { name: string; ingredients: string[]; benefits: string; prepTime: string };
  dinner: { name: string; ingredients: string[]; benefits: string; prepTime: string };
  snacks: string[];
  hydration: string;
  supplements: string[];
}

export default function MealPlan() {
  const { user } = useAuth();
  const { data: profile, isLoading: loadingProfile } = usePcosProfile();
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null);
  const [showGroceryList, setShowGroceryList] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meal-plan/generate", {
        preferences: [],
        allergies: [],
      });
      return res.json();
    },
    onSuccess: (data: MealPlanData) => {
      setMealPlan(data);
    },
  });

  const phase = getCyclePhase(profile);

  if (loadingProfile) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Your Meal Plan
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered nutrition personalized to your cycle phase and PCOS type
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              Powered by Minimax AI
            </Badge>
            <span className={`pcos-badge pcos-badge--${profile?.pcosType || "unknown"}`}>
              {(profile?.pcosType || "unknown").replace("_", " ")}
            </span>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <ChefHat className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Daily Meal Plan</CardTitle>
                <CardDescription>
                  Optimized for your{" "}
                  <span className={`cycle-tracker__phase cycle-tracker__phase--${phase}`}>
                    {phase}
                  </span>{" "}
                  phase
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="button-generate-meal-plan"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {mealPlan ? "Regenerate" : "Generate Plan"}
              </Button>
              {mealPlan && (
                <Button
                  variant="outline"
                  onClick={() => setShowGroceryList(!showGroceryList)}
                  data-testid="button-toggle-grocery-list"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {showGroceryList ? "Hide" : "Show"} Grocery List
                </Button>
              )}
            </div>
          </div>

          {!mealPlan && !generateMutation.isPending && (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-meal-plan">
              <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No meal plan generated yet</p>
              <p className="text-sm max-w-md mx-auto">
                Click "Generate Plan" to get a personalized meal plan based on your
                {profile?.pcosType ? ` ${profile.pcosType.replace("_", " ")} PCOS type` : " profile"} and
                current {phase} phase.
              </p>
            </div>
          )}

          {generateMutation.isPending && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating your personalized meal plan...</p>
            </div>
          )}

          {mealPlan && !generateMutation.isPending && (
            <MealPlanCard
              breakfast={mealPlan.breakfast}
              lunch={mealPlan.lunch}
              dinner={mealPlan.dinner}
              snacks={mealPlan.snacks}
              hydration={mealPlan.hydration}
              supplements={mealPlan.supplements}
            />
          )}
        </Card>

        {showGroceryList && user && (
          <ConvexGroceryList
            userId={user.claims.sub}
            pcosType={profile?.pcosType || "unknown"}
            cyclePhase={phase}
          />
        )}
      </div>
    </Layout>
  );
}
