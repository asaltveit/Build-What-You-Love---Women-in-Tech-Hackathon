import "@/styles/bem-components.css";
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
        <div className="rec-card rec-card--nutrition" data-testid="card-nutrition">
          <div className="rec-card__header">
            <Salad className="rec-card__icon" />
            <span className="rec-card__title">Nutrition Focus</span>
          </div>
          <div className="rec-card__body">{nutrition.focus}</div>
          <ul className="rec-card__list">
            {nutrition.foodsToEat.slice(0, 4).map((food, i) => (
              <li key={i} className="rec-card__tag rec-card__tag--eat">
                <Check className="w-3 h-3" /> {food}
              </li>
            ))}
            {nutrition.foodsToAvoid.slice(0, 3).map((food, i) => (
              <li key={`a-${i}`} className="rec-card__tag rec-card__tag--avoid">
                <X className="w-3 h-3" /> {food}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exercise && (
        <div className="rec-card rec-card--exercise" data-testid="card-exercise">
          <div className="rec-card__header">
            <Dumbbell className="rec-card__icon" />
            <span className="rec-card__title">Exercise Focus</span>
          </div>
          <div className="rec-card__body">
            {exercise.focus} — Intensity: {exercise.intensity}
          </div>
          <ul className="rec-card__list">
            {exercise.recommendedTypes.map((type, i) => (
              <li key={i} className="rec-card__tag rec-card__tag--eat">
                <Check className="w-3 h-3" /> {type}
              </li>
            ))}
          </ul>
        </div>
      )}

      {lifestyle && (
        <div className="rec-card rec-card--lifestyle" data-testid="card-lifestyle">
          <div className="rec-card__header">
            <Heart className="rec-card__icon" />
            <span className="rec-card__title">Lifestyle Tip</span>
          </div>
          <div className="rec-card__body">{lifestyle}</div>
        </div>
      )}
    </div>
  );
}
