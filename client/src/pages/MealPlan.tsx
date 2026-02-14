import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChefHat, RefreshCw, ShoppingCart, Calendar, UtensilsCrossed, Clock } from "lucide-react";
import { usePcosProfile } from "@/hooks/use-pcos";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ConvexGroceryList from "@/components/ConvexGroceryList";
import "@/styles/bem-components.css";

function getCyclePhase(profile: any): string {
  if (!profile) return "follicular";
  const today = new Date();
  const lastPeriod = new Date(profile.lastPeriodDate);
  const cycleLength = profile.cycleLength || 28;
  const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) % cycleLength;

  let menstrualDuration = 5;
  if (profile.lastPeriodEndDate) {
    const endDate = new Date(profile.lastPeriodEndDate);
    const duration = Math.floor((endDate.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) + 1;
    if (duration >= 2 && duration <= 10) menstrualDuration = duration;
  }

  if (diffDays < menstrualDuration) return "menstrual";
  if (diffDays < 14) return "follicular";
  if (diffDays < 17) return "ovulatory";
  return "luteal";
}

interface Meal {
  name: string;
  ingredients: string[];
  benefits: string;
  prepTime: string;
}

interface DayPlan {
  day: number;
  dayLabel: string;
  phase: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: string[];
}

interface WeeklyMealPlan {
  currentPhase: string;
  cycleDay: number;
  days: DayPlan[];
  hydration: string;
  supplements: string[];
}

const phaseColors: Record<string, string> = {
  menstrual: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  follicular: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ovulatory: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  luteal: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

function MealCard({ meal, type }: { meal: Meal; type: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-semibold text-sm text-foreground">{type}</h4>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {meal.prepTime}
        </span>
      </div>
      <p className="font-medium text-foreground">{meal.name}</p>
      <p className="text-xs text-muted-foreground">{meal.benefits}</p>
      <div className="flex flex-wrap gap-1">
        {meal.ingredients.map((ing, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {ing}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function MealPlan() {
  const { user } = useAuth();
  const { data: profile, isLoading: loadingProfile } = usePcosProfile();
  const [mealPlan, setMealPlan] = useState<WeeklyMealPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showGroceryList, setShowGroceryList] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meal-plan/generate", {
        preferences: [],
        allergies: [],
      });
      return res.json();
    },
    onSuccess: (data: WeeklyMealPlan) => {
      setMealPlan(data);
      setSelectedDay(0);
    },
  });

  const phase = getCyclePhase(profile);
  const currentDayPlan = mealPlan?.days?.[selectedDay];

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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-meal-plan-title">
              Weekly Meal Plan
            </h1>
            <p className="text-muted-foreground mt-1">
              7-day AI-powered nutrition adapting to your cycle phase changes
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
                <CardTitle>7-Day Meal Plan</CardTitle>
                <CardDescription>
                  Starting from your{" "}
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
                Click "Generate Plan" to get a personalized 7-day meal plan based on your
                {profile?.pcosType ? ` ${profile.pcosType.replace("_", " ")} PCOS type` : " profile"} and
                cycle phase progression.
              </p>
            </div>
          )}

          {generateMutation.isPending && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating your 7-day personalized meal plan...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
          )}

          {mealPlan && !generateMutation.isPending && (
            <div className="space-y-4">
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {mealPlan.days.map((day, idx) => (
                  <Button
                    key={idx}
                    variant={selectedDay === idx ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDay(idx)}
                    className="shrink-0"
                    data-testid={`button-day-${idx + 1}`}
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {day.dayLabel}
                  </Button>
                ))}
              </div>

              {currentDayPlan && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`no-default-hover-elevate no-default-active-elevate ${phaseColors[currentDayPlan.phase] || ""}`} data-testid={`badge-phase-${selectedDay}`}>
                      {currentDayPlan.phase} phase
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Day {currentDayPlan.day} of your week
                    </span>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card data-testid="card-breakfast">
                      <div className="flex items-center gap-2 mb-3">
                        <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Breakfast</span>
                      </div>
                      <MealCard meal={currentDayPlan.breakfast} type="" />
                    </Card>
                    <Card data-testid="card-lunch">
                      <div className="flex items-center gap-2 mb-3">
                        <UtensilsCrossed className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Lunch</span>
                      </div>
                      <MealCard meal={currentDayPlan.lunch} type="" />
                    </Card>
                    <Card data-testid="card-dinner">
                      <div className="flex items-center gap-2 mb-3">
                        <UtensilsCrossed className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Dinner</span>
                      </div>
                      <MealCard meal={currentDayPlan.dinner} type="" />
                    </Card>
                  </div>

                  {currentDayPlan.snacks && currentDayPlan.snacks.length > 0 && (
                    <Card>
                      <h4 className="font-semibold text-sm mb-2">Snacks</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentDayPlan.snacks.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <h4 className="font-semibold text-sm mb-2">Hydration</h4>
                  <p className="text-sm text-muted-foreground">{mealPlan.hydration}</p>
                </Card>
                <Card>
                  <h4 className="font-semibold text-sm mb-2">Supplements</h4>
                  <div className="flex flex-wrap gap-2">
                    {mealPlan.supplements.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Card>

        {showGroceryList && user && (
          <ConvexGroceryList
            userId={user.id}
            pcosType={profile?.pcosType || "unknown"}
            cyclePhase={phase}
          />
        )}
      </div>
    </Layout>
  );
}
