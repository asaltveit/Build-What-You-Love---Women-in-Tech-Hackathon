import { Salad, Dumbbell, Heart, Check, X } from "lucide-react";

interface NutritionData {
  focus: string;
  foodsToEat: string[];
  foodsToAvoid: string[];
}

interface ExerciseData {
  focus: string;
  recommendedTypes: string[];
  intensity: "low" | "medium" | "high";
}

interface RecommendationCardsProps {
  nutrition?: NutritionData;
  exercise?: ExerciseData;
  lifestyle?: string;
}

export default function RecommendationCards({ nutrition, exercise, lifestyle }: RecommendationCardsProps) {
  return (
    <div className="flex flex-col gap-3">
      {nutrition && (
        <div
          className="p-4 rounded-md bg-gradient-to-br from-[hsl(145,40%,96%)] to-[hsl(145,30%,92%)] dark:from-[hsl(145,20%,15%)] dark:to-[hsl(145,15%,12%)]"
          data-testid="card-nutrition"
        >
          <div className="flex items-center gap-2 mb-2">
            <Salad className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">Nutrition Focus</span>
          </div>
          <div className="text-[0.8125rem] text-muted-foreground leading-relaxed">{nutrition.focus}</div>
          <ul className="list-none p-0 mt-2 flex flex-wrap gap-1.5">
            {nutrition.foodsToEat.slice(0, 4).map((food, i) => (
              <li key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(145,50%,90%)] text-[hsl(145,60%,30%)] dark:bg-[hsl(145,30%,20%)] dark:text-[hsl(145,50%,70%)]">
                <Check className="w-3 h-3" /> {food}
              </li>
            ))}
            {nutrition.foodsToAvoid.slice(0, 3).map((food, i) => (
              <li key={`a-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(350,50%,90%)] text-[hsl(350,60%,30%)] dark:bg-[hsl(350,30%,20%)] dark:text-[hsl(350,50%,70%)]">
                <X className="w-3 h-3" /> {food}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exercise && (
        <div
          className="p-4 rounded-md bg-gradient-to-br from-[hsl(265,40%,96%)] to-[hsl(265,30%,92%)] dark:from-[hsl(265,20%,15%)] dark:to-[hsl(265,15%,12%)]"
          data-testid="card-exercise"
        >
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">Exercise Focus</span>
          </div>
          <div className="text-[0.8125rem] text-muted-foreground leading-relaxed">
            {exercise.focus} — Intensity: {exercise.intensity}
          </div>
          <ul className="list-none p-0 mt-2 flex flex-wrap gap-1.5">
            {exercise.recommendedTypes.map((type, i) => (
              <li key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(145,50%,90%)] text-[hsl(145,60%,30%)] dark:bg-[hsl(145,30%,20%)] dark:text-[hsl(145,50%,70%)]">
                <Check className="w-3 h-3" /> {type}
              </li>
            ))}
          </ul>
        </div>
      )}

      {lifestyle && (
        <div
          className="p-4 rounded-md bg-gradient-to-br from-[hsl(35,40%,96%)] to-[hsl(35,30%,92%)] dark:from-[hsl(35,20%,15%)] dark:to-[hsl(35,15%,12%)]"
          data-testid="card-lifestyle"
        >
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">Lifestyle Tip</span>
          </div>
          <div className="text-[0.8125rem] text-muted-foreground leading-relaxed">{lifestyle}</div>
        </div>
      )}
    </div>
  );
}
