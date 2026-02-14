import "@/styles/bem-components.css";
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

function MealItem({ meal, time }: { meal: Meal; time: "breakfast" | "lunch" | "dinner" }) {
  const labels = { breakfast: "AM", lunch: "PM", dinner: "EVE" };
  return (
    <div className="meal-plan__item" data-testid={`meal-${time}`}>
      <div className={`meal-plan__time-badge meal-plan__time-badge--${time}`}>
        {labels[time]}
      </div>
      <div className="meal-plan__details">
        <div className="meal-plan__name">{meal.name}</div>
        <div className="meal-plan__meta">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {meal.prepTime}
          </span>
          <span className="ml-2 text-muted-foreground">{meal.benefits}</span>
        </div>
        <div className="meal-plan__ingredients">
          {meal.ingredients.map((ing, i) => (
            <span key={i} className="meal-plan__ingredient">{ing}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MealPlanCard({ breakfast, lunch, dinner, snacks, hydration, supplements }: MealPlanCardProps) {
  return (
    <div className="meal-plan" data-testid="meal-plan">
      <MealItem meal={breakfast} time="breakfast" />
      <MealItem meal={lunch} time="lunch" />
      <MealItem meal={dinner} time="dinner" />

      <div className="meal-plan__item">
        <div className="meal-plan__time-badge" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
          <Utensils className="w-3 h-3" />
        </div>
        <div className="meal-plan__details">
          <div className="meal-plan__name">Snacks & Extras</div>
          <div className="meal-plan__ingredients">
            {snacks.map((s, i) => (
              <span key={i} className="meal-plan__ingredient">{s}</span>
            ))}
          </div>
          <div className="meal-plan__meta mt-1">
            <span>Hydration: {hydration}</span>
          </div>
          <div className="meal-plan__meta mt-1">
            <span>Supplements: {supplements.join(", ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
