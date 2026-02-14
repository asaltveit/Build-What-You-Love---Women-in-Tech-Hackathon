import OpenAI from "openai";

const minimaxClient = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY || "placeholder",
  baseURL: "https://api.minimax.chat/v1",
});

export interface MealPlanRequest {
  pcosType: string;
  cyclePhase: string;
  cycleDay: number;
  preferences?: string[];
  allergies?: string[];
}

export interface MealPlanResponse {
  breakfast: {
    name: string;
    ingredients: string[];
    benefits: string;
    prepTime: string;
  };
  lunch: {
    name: string;
    ingredients: string[];
    benefits: string;
    prepTime: string;
  };
  dinner: {
    name: string;
    ingredients: string[];
    benefits: string;
    prepTime: string;
  };
  snacks: string[];
  hydration: string;
  supplements: string[];
}

export async function generateMealPlan(request: MealPlanRequest): Promise<MealPlanResponse> {
  const prompt = `You are a certified nutritionist specializing in PCOS management and menstrual cycle nutrition.

Create a detailed daily meal plan for a woman with the following profile:
- PCOS Type: ${request.pcosType}
- Current Cycle Phase: ${request.cyclePhase} (Day ${request.cycleDay})
${request.preferences?.length ? `- Dietary Preferences: ${request.preferences.join(", ")}` : ""}
${request.allergies?.length ? `- Allergies/Restrictions: ${request.allergies.join(", ")}` : ""}

Important guidelines by PCOS type:
- Insulin Resistant: Focus on low-glycemic foods, lean proteins, healthy fats. Avoid refined carbs and sugar.
- Inflammatory: Anti-inflammatory foods (turmeric, omega-3s, leafy greens). Avoid dairy, gluten, processed foods.
- Adrenal: Stress-reducing foods, balanced meals, adequate carbs. Avoid caffeine, high-intensity fasting.
- Post-Pill: Liver-supporting foods, zinc, B vitamins. Avoid excess estrogen-mimicking foods.

Important guidelines by cycle phase:
- Menstrual: Iron-rich foods, warming meals, gentle on digestion
- Follicular: Light, fresh foods, sprouted grains, fermented foods
- Ovulatory: Raw vegetables, anti-inflammatory foods, fiber
- Luteal: Complex carbs, magnesium-rich foods, serotonin boosters

Respond in JSON format:
{
  "breakfast": { "name": "string", "ingredients": ["string"], "benefits": "string", "prepTime": "string" },
  "lunch": { "name": "string", "ingredients": ["string"], "benefits": "string", "prepTime": "string" },
  "dinner": { "name": "string", "ingredients": ["string"], "benefits": "string", "prepTime": "string" },
  "snacks": ["string"],
  "hydration": "string",
  "supplements": ["string"]
}`;

  try {
    const response = await minimaxClient.chat.completions.create({
      model: "MiniMax-Text-01",
      messages: [
        { role: "system", content: "You are a PCOS nutrition specialist. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Minimax API error:", error);
    return getDefaultMealPlan(request.pcosType, request.cyclePhase);
  }
}

function getDefaultMealPlan(pcosType: string, phase: string): MealPlanResponse {
  const plans: Record<string, MealPlanResponse> = {
    menstrual: {
      breakfast: { name: "Warm Oatmeal Bowl", ingredients: ["oats", "banana", "cinnamon", "walnuts", "iron-fortified milk"], benefits: "Iron-rich to replenish during menstruation", prepTime: "10 min" },
      lunch: { name: "Lentil & Spinach Soup", ingredients: ["red lentils", "spinach", "turmeric", "garlic", "bone broth"], benefits: "Anti-inflammatory, iron and protein rich", prepTime: "30 min" },
      dinner: { name: "Salmon with Sweet Potato", ingredients: ["wild salmon", "sweet potato", "steamed broccoli", "olive oil"], benefits: "Omega-3s reduce cramps, complex carbs for energy", prepTime: "25 min" },
      snacks: ["Dark chocolate (70%+)", "Trail mix with pumpkin seeds"],
      hydration: "Warm ginger-lemon water, chamomile tea",
      supplements: ["Iron", "Magnesium", "Vitamin D"]
    },
    follicular: {
      breakfast: { name: "Green Smoothie Bowl", ingredients: ["kale", "banana", "flax seeds", "almond milk", "avocado"], benefits: "Estrogen-supporting nutrients for follicle development", prepTime: "5 min" },
      lunch: { name: "Quinoa Buddha Bowl", ingredients: ["quinoa", "chickpeas", "roasted vegetables", "tahini dressing"], benefits: "Balanced macros for rising energy levels", prepTime: "20 min" },
      dinner: { name: "Chicken Stir-Fry", ingredients: ["chicken breast", "broccoli", "bell peppers", "brown rice", "coconut aminos"], benefits: "Lean protein supports hormone production", prepTime: "20 min" },
      snacks: ["Apple with almond butter", "Fermented foods (kimchi, sauerkraut)"],
      hydration: "Green tea, lemon water",
      supplements: ["Probiotics", "Zinc", "B-Complex"]
    },
    ovulatory: {
      breakfast: { name: "Berry Protein Parfait", ingredients: ["Greek yogurt", "mixed berries", "granola", "chia seeds"], benefits: "Antioxidants and protein for peak fertility", prepTime: "5 min" },
      lunch: { name: "Mediterranean Salad", ingredients: ["mixed greens", "grilled chicken", "olives", "cucumber", "feta"], benefits: "Anti-inflammatory fats support ovulation", prepTime: "15 min" },
      dinner: { name: "Baked Cod with Vegetables", ingredients: ["cod fillet", "asparagus", "cherry tomatoes", "lemon", "herbs"], benefits: "Light, nutrient-dense for hormonal peak", prepTime: "25 min" },
      snacks: ["Raw veggie sticks with hummus", "Brazil nuts"],
      hydration: "Coconut water, cold-pressed juice",
      supplements: ["Vitamin E", "Selenium", "Omega-3"]
    },
    luteal: {
      breakfast: { name: "Pumpkin Seed Pancakes", ingredients: ["oat flour", "pumpkin seeds", "banana", "eggs", "cinnamon"], benefits: "Magnesium-rich to reduce PMS symptoms", prepTime: "15 min" },
      lunch: { name: "Turkey & Avocado Wrap", ingredients: ["whole wheat wrap", "turkey", "avocado", "spinach", "tomato"], benefits: "Tryptophan and B6 for serotonin production", prepTime: "10 min" },
      dinner: { name: "Beef & Root Vegetable Stew", ingredients: ["grass-fed beef", "carrots", "parsnips", "potatoes", "rosemary"], benefits: "Complex carbs and iron for luteal support", prepTime: "45 min" },
      snacks: ["Dark chocolate squares", "Banana with cashew butter"],
      hydration: "Warm turmeric latte, peppermint tea",
      supplements: ["Magnesium", "Calcium", "Evening Primrose Oil"]
    }
  };

  return plans[phase] || plans.follicular;
}
