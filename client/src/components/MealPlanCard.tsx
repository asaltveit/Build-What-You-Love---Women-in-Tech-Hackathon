import { Clock, Utensils } from "lucide-react";

interface Meal {
  name: string;
  ingredients: string[];
  benefits: string;
  prepTime: string;
}

interface MealPlanCardProps {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: string[];
  hydration: string;
  supplements: string[];
}

const timeBadgeStyles: Record<string, string> = {
  breakfast: "bg-[hsl(35,80%,90%)] text-[hsl(35,80%,35%)] dark:bg-[hsl(35,40%,20%)] dark:text-[hsl(35,60%,65%)]",
  lunch: "bg-[hsl(145,50%,90%)] text-[hsl(145,60%,30%)] dark:bg-[hsl(145,30%,18%)] dark:text-[hsl(145,50%,65%)]",
  dinner: "bg-[hsl(265,50%,90%)] text-[hsl(265,60%,30%)] dark:bg-[hsl(265,30%,20%)] dark:text-[hsl(265,50%,65%)]",
};

function MealItem({ meal, time }: { meal: Meal; time: "breakfast" | "lunch" | "dinner" }) {
  const labels = { breakfast: "AM", lunch: "PM", dinner: "EVE" };
  return (
    <div className="flex gap-3 p-3 rounded-md bg-card border border-border" data-testid={`meal-${time}`}>
      <div className={`flex items-center justify-center w-10 h-10 rounded-md text-[0.625rem] font-semibold uppercase shrink-0 ${timeBadgeStyles[time]}`}>
        {labels[time]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm mb-1">{meal.name}</div>
        <div className="text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {meal.prepTime}
          </span>
          <span className="ml-2 text-muted-foreground">{meal.benefits}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {meal.ingredients.map((ing, i) => (
            <span key={i} className="text-[0.6875rem] px-1.5 py-px rounded-full bg-muted text-muted-foreground">{ing}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MealPlanCard({ breakfast, lunch, dinner, snacks, hydration, supplements }: MealPlanCardProps) {
  return (
    <div className="flex flex-col gap-4" data-testid="meal-plan">
      <MealItem meal={breakfast} time="breakfast" />
      <MealItem meal={lunch} time="lunch" />
      <MealItem meal={dinner} time="dinner" />

      <div className="flex gap-3 p-3 rounded-md bg-card border border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-md shrink-0 bg-muted text-muted-foreground">
          <Utensils className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Snacks & Extras</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {snacks.map((s, i) => (
              <span key={i} className="text-[0.6875rem] px-1.5 py-px rounded-full bg-muted text-muted-foreground">{s}</span>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <span>Hydration: {hydration}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <span>Supplements: {supplements.join(", ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
