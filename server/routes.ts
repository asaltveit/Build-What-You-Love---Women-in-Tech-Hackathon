import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import OpenAI from "openai";
import { generateWeeklyMealPlan } from "./minimax";
import { transcribeAudio } from "./minimax-stt";
import multer from "multer";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);

  // === APP ROUTES ===

  // 1. PCOS Analysis (AI)
  app.post(api.pcos.analyze.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.pcos.analyze.input.parse(req.body);

      // Construct prompt for AI
      const prompt = `
        Analyze the following patient profile for PCOS type and give recommendations.
        Symptoms: ${input.symptoms.join(", ")}
        Cycle Regularity: ${input.cycleRegularity}
        Physical Signs:
        - Weight Concerns: ${input.weightConcerns}
        - Hair Growth (Hirsutism): ${input.hairGrowth}
        - Acne: ${input.acne}
        - Fatigue: ${input.fatigue}

        Determine the most likely PCOS type from: 'insulin_resistant', 'inflammatory', 'adrenal', 'post_pill'.
        If unclear, use 'unknown'.
        Provide a confidence score (0-1).
        Explain why.
        Give 3 top recommendations.
        
        Respond in JSON format:
        {
          "detectedType": "enum value",
          "confidence": number,
          "explanation": "string",
          "recommendations": ["string"]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: "You are a specialized gynecological health assistant helping identify PCOS types." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to analyze data" });
    }
  });

  // 2. Profile Management
  app.get(api.pcos.getProfile.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getPcosProfile(userId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  });

  app.post(api.pcos.updateProfile.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const input = api.pcos.updateProfile.input.parse(req.body);
    
    const profile = await storage.createOrUpdatePcosProfile({
      ...input,
      userId,
    });
    res.json(profile);
  });

  // 3. Daily Logs
  app.get(api.logs.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const logs = await storage.getDailyLogs(userId);
    res.json(logs);
  });

  app.post(api.logs.create.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const input = api.logs.create.input.parse(req.body);
    const log = await storage.createDailyLog({ ...input, userId });
    res.status(201).json(log);
  });

  // 4. Recommendations (AI + Logic)
  app.get(api.recommendations.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getPcosProfile(userId);

    // Default response if no profile
    if (!profile) {
      return res.status(404).json({ message: "Create a PCOS profile first" });
    }

    const today = new Date();
    const lastPeriod = new Date(profile.lastPeriodDate);
    const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) % profile.cycleLength;
    
    let menstrualDuration = 5;
    if (profile.lastPeriodEndDate) {
      const endDate = new Date(profile.lastPeriodEndDate);
      const dur = Math.floor((endDate.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) + 1;
      if (dur >= 2 && dur <= 10) menstrualDuration = dur;
    }

    let phase = "follicular";
    if (diffDays < menstrualDuration) phase = "menstrual";
    else if (diffDays < 14) phase = "follicular";
    else if (diffDays < 17) phase = "ovulatory";
    else phase = "luteal";

    // AI Generation for personalized advice
    const prompt = `
      User Profile:
      - PCOS Type: ${profile.pcosType}
      - Current Cycle Phase: ${phase} (Day ${diffDays})
      
      Generate a daily plan JSON:
      {
        "phase": "${phase}",
        "nutrition": { "focus": "string", "foodsToEat": ["string"], "foodsToAvoid": ["string"] },
        "exercise": { "focus": "string", "recommendedTypes": ["string"], "intensity": "low/medium/high" },
        "lifestyle": "string"
      }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const plan = JSON.parse(response.choices[0].message.content || "{}");
      res.json(plan);
    } catch (err) {
      // Fallback
      res.json({
        phase,
        nutrition: { focus: "Balanced", foodsToEat: ["Whole foods"], foodsToAvoid: ["Sugar"] },
        exercise: { focus: "Movement", recommendedTypes: ["Walking"], intensity: "medium" },
        lifestyle: "Sleep well"
      });
    }
  });

  // 5. Groceries Search (personalized)
  app.get(api.groceries.search.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { query } = req.query;
    const profile = await storage.getPcosProfile(userId);

    const items = await storage.searchGroceryItems(query as string);

    let phase = "follicular";
    if (profile) {
      const today = new Date();
      const lastPeriod = new Date(profile.lastPeriodDate);
      const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) % profile.cycleLength;

      let mensDur = 5;
      if (profile.lastPeriodEndDate) {
        const endDate = new Date(profile.lastPeriodEndDate);
        const d = Math.floor((endDate.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) + 1;
        if (d >= 2 && d <= 10) mensDur = d;
      }

      if (diffDays < mensDur) phase = "menstrual";
      else if (diffDays < 14) phase = "follicular";
      else if (diffDays < 17) phase = "ovulatory";
      else phase = "luteal";
    }

    const pcosType = profile?.pcosType || "unknown";

    const results = items.map(item => {
      const pcosSuit = item.pcosSuitability as Record<string, string> | null;
      const cycleSuit = item.cyclePhaseSuitability as Record<string, string> | null;
      const pcosRating = pcosSuit?.[pcosType] || "neutral";
      const cycleRating = cycleSuit?.[phase] || "neutral";

      let suitability: "recommended" | "avoid" | "neutral" = "neutral";
      if (pcosRating === "avoid" || cycleRating === "avoid") suitability = "avoid";
      else if (pcosRating === "recommended" || cycleRating === "recommended") suitability = "recommended";

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        benefits: item.benefits,
        suitability,
        pcosRating,
        cycleRating,
        storePricing: item.storePricing || [],
        dietaryTags: (item.dietaryTags as string[]) || [],
      };
    });

    results.sort((a, b) => {
      const order = { recommended: 0, neutral: 1, avoid: 2 };
      return (order[a.suitability] || 1) - (order[b.suitability] || 1);
    });

    res.json(results);
  });

  // 6. Meal Plan Generation (Minimax AI)
  app.post(api.mealPlan.generate.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getPcosProfile(userId);

    if (!profile) {
      return res.status(404).json({ message: "Create a PCOS profile first" });
    }

    const { preferences, allergies } = req.body;

    const today = new Date();
    const lastPeriod = new Date(profile.lastPeriodDate);
    const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) % profile.cycleLength;

    let menstrualDur = 5;
    if (profile.lastPeriodEndDate) {
      const endDate = new Date(profile.lastPeriodEndDate);
      const dur = Math.floor((endDate.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) + 1;
      if (dur >= 2 && dur <= 10) menstrualDur = dur;
    }

    let phase = "follicular";
    if (diffDays < menstrualDur) phase = "menstrual";
    else if (diffDays < 14) phase = "follicular";
    else if (diffDays < 17) phase = "ovulatory";
    else phase = "luteal";

    try {
      const mealPlan = await generateWeeklyMealPlan({
        pcosType: profile.pcosType,
        cyclePhase: phase,
        cycleDay: diffDays,
        cycleLength: profile.cycleLength,
        preferences,
        allergies,
      });
      res.json(mealPlan);
    } catch (err) {
      console.error("Meal plan generation error:", err);
      res.status(500).json({ message: "Failed to generate meal plan" });
    }
  });

  // 7. Voice Transcription (Minimax STT)
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
  app.post("/api/voice/transcribe", isAuthenticated, upload.single("audio"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const mimeType = req.file.mimetype || "audio/webm";
      const result = await transcribeAudio(req.file.buffer, mimeType);

      if (!result.text) {
        return res.status(422).json({
          message: "Could not transcribe audio. Please try speaking more clearly or use text input.",
        });
      }

      res.json(result);
    } catch (err) {
      console.error("Voice transcription error:", err);
      res.status(500).json({ message: "Transcription failed" });
    }
  });

  // 8. Fridge Scanner (OpenAI Vision)
  const fridgeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  app.post("/api/fridge/scan", isAuthenticated, fridgeUpload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }

      const userId = req.user.claims.sub;
      const profile = await storage.getPcosProfile(userId);

      const base64Image = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype || "image/jpeg";

      const visionResponse = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are a grocery identification assistant for a PCOS health app. Analyze the fridge/pantry photo and identify all visible food items. For each item, provide the name, category, and an estimated quantity. Categories: protein, vegetable, fruit, grain, fat, spice, beverage, dairy, other. Return JSON: { "items": [{ "name": "string", "category": "string", "quantity": "string" }] }. Be specific with item names (e.g. "Greek Yogurt" not just "yogurt"). Only list items you can clearly identify.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify all grocery items visible in this fridge/pantry photo." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const identified = JSON.parse(visionResponse.choices[0].message.content || '{"items":[]}');
      const identifiedItems: Array<{ name: string; category: string; quantity: string }> = identified.items || [];

      let phase = "follicular";
      const pcosType = profile?.pcosType || "unknown";
      if (profile) {
        const today = new Date();
        const lastPeriod = new Date(profile.lastPeriodDate);
        const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) % profile.cycleLength;
        let mensDur = 5;
        if (profile.lastPeriodEndDate) {
          const endDate = new Date(profile.lastPeriodEndDate);
          const d = Math.floor((endDate.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) + 1;
          if (d >= 2 && d <= 10) mensDur = d;
        }
        if (diffDays < mensDur) phase = "menstrual";
        else if (diffDays < 14) phase = "follicular";
        else if (diffDays < 17) phase = "ovulatory";
        else phase = "luteal";
      }

      const allGroceries = await storage.searchGroceryItems();

      const results = identifiedItems.map((item) => {
        const match = allGroceries.find(
          (g) => g.name.toLowerCase() === item.name.toLowerCase()
        ) || allGroceries.find(
          (g) => g.name.toLowerCase().includes(item.name.toLowerCase()) ||
                 item.name.toLowerCase().includes(g.name.toLowerCase())
        );

        let suitability: "recommended" | "avoid" | "neutral" = "neutral";
        let pcosRating = "neutral";
        let cycleRating = "neutral";
        let benefits: string | null = null;

        if (match) {
          const pcosSuit = match.pcosSuitability as Record<string, string> | null;
          const cycleSuit = match.cyclePhaseSuitability as Record<string, string> | null;
          pcosRating = pcosSuit?.[pcosType] || "neutral";
          cycleRating = cycleSuit?.[phase] || "neutral";
          benefits = match.benefits;
          if (pcosRating === "avoid" || cycleRating === "avoid") suitability = "avoid";
          else if (pcosRating === "recommended" || cycleRating === "recommended") suitability = "recommended";
        }

        return {
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          suitability,
          pcosRating,
          cycleRating,
          benefits,
          matched: !!match,
        };
      });

      results.sort((a, b) => {
        const order = { recommended: 0, neutral: 1, avoid: 2 };
        return (order[a.suitability] || 1) - (order[b.suitability] || 1);
      });

      res.json({ items: results, phase, pcosType });
    } catch (err) {
      console.error("Fridge scan error:", err);
      res.status(500).json({ message: "Failed to analyze fridge photo" });
    }
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.searchGroceryItems();
  if (existing.length > 7) return;

  type Suit = "recommended" | "avoid" | "neutral";
  const r: Suit = "recommended", a: Suit = "avoid", n: Suit = "neutral";

  const sp = (wf: string, sp: string, tj: string, wm: string) => [
    { store: "Whole Foods", priceRange: wf, available: true },
    { store: "Sprouts", priceRange: sp, available: true },
    { store: "Trader Joe's", priceRange: tj, available: true },
    { store: "Walmart", priceRange: wm, available: true },
  ];

  type DT = "vegan" | "vegetarian" | "pescatarian" | "non_vegetarian";
  const V: DT = "vegan", VG: DT = "vegetarian", P: DT = "pescatarian", NV: DT = "non_vegetarian";

  const foods = [
    { name: "Wild Salmon", category: "protein", benefits: "Rich in omega-3 fatty acids, reduces inflammation and supports hormone balance", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$12-16/lb", "$10-14/lb", "$8-12/lb", "$7-11/lb"), dietaryTags: [P, NV] },
    { name: "Spinach", category: "vegetable", benefits: "High in iron and folate, essential during menstruation and for hormone production", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: n, luteal: r }, storePricing: sp("$3-5", "$2-4", "$2-3", "$2-3"), dietaryTags: [V, VG, P, NV] },
    { name: "Blueberries", category: "fruit", benefits: "Packed with antioxidants that fight inflammation and support insulin sensitivity", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$5-7", "$4-6", "$3-5", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Quinoa", category: "grain", benefits: "Complete protein with low glycemic index, stabilizes blood sugar", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: n, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$5-8", "$4-7", "$3-5", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Avocado", category: "fat", benefits: "Healthy monounsaturated fats support hormone production and reduce inflammation", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$2-3/ea", "$1.50-2.50/ea", "$1-2/ea", "$1-2/ea"), dietaryTags: [V, VG, P, NV] },
    { name: "Turmeric", category: "spice", benefits: "Powerful anti-inflammatory that helps manage PCOS symptoms", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: n, post_pill: n }, cyclePhaseSuitability: { menstrual: r, follicular: n, ovulatory: n, luteal: r }, storePricing: sp("$4-7", "$3-6", "$3-5", "$2-4"), dietaryTags: [V, VG, P, NV] },
    { name: "Green Tea", category: "beverage", benefits: "Contains EGCG which improves insulin sensitivity and supports weight management", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: a, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: n }, storePricing: sp("$5-8", "$4-7", "$3-5", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Sweet Potato", category: "vegetable", benefits: "Complex carbs with low GI, rich in vitamin A for hormone health", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: n, ovulatory: n, luteal: r }, storePricing: sp("$2-4/lb", "$1.50-3/lb", "$1-2/lb", "$1-2/lb"), dietaryTags: [V, VG, P, NV] },
    { name: "Walnuts", category: "fat", benefits: "Omega-3s and healthy fats that reduce androgens and improve insulin response", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: n, luteal: r }, storePricing: sp("$8-12", "$7-10", "$6-9", "$5-8"), dietaryTags: [V, VG, P, NV] },
    { name: "Lentils", category: "protein", benefits: "Plant protein with fiber that stabilizes blood sugar and supports gut health", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: n, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$3-5", "$2-4", "$2-3", "$1-3"), dietaryTags: [V, VG, P, NV] },
    { name: "Broccoli", category: "vegetable", benefits: "Contains DIM which helps metabolize excess estrogen, supports detoxification", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$3-5", "$2-4", "$2-3", "$2-3"), dietaryTags: [V, VG, P, NV] },
    { name: "Chia Seeds", category: "fat", benefits: "High in omega-3 and fiber, helps stabilize blood sugar levels", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$6-10", "$5-8", "$4-7", "$4-6"), dietaryTags: [V, VG, P, NV] },
    { name: "Eggs", category: "protein", benefits: "Complete protein with choline for hormone support, vitamin D for fertility", pcosSuitability: { insulin_resistant: r, inflammatory: n, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$5-8/dz", "$4-6/dz", "$3-5/dz", "$3-5/dz"), dietaryTags: [VG, P, NV] },
    { name: "Ginger", category: "spice", benefits: "Anti-inflammatory, eases menstrual cramps and supports digestion", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: n, post_pill: n }, cyclePhaseSuitability: { menstrual: r, follicular: n, ovulatory: n, luteal: r }, storePricing: sp("$4-6", "$3-5", "$2-4", "$2-4"), dietaryTags: [V, VG, P, NV] },
    { name: "Chicken Breast", category: "protein", benefits: "Lean protein that supports muscle repair and hormone production", pcosSuitability: { insulin_resistant: r, inflammatory: n, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$8-12/lb", "$6-10/lb", "$5-8/lb", "$4-7/lb"), dietaryTags: [NV] },
    { name: "Kale", category: "vegetable", benefits: "Nutrient-dense with calcium, vitamin K, supports detoxification", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$3-5", "$2-4", "$2-3", "$2-3"), dietaryTags: [V, VG, P, NV] },
    { name: "Cinnamon", category: "spice", benefits: "Improves insulin sensitivity and helps regulate blood sugar levels", pcosSuitability: { insulin_resistant: r, inflammatory: n, adrenal: n, post_pill: n }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: n, luteal: r }, storePricing: sp("$4-7", "$3-5", "$2-4", "$2-4"), dietaryTags: [V, VG, P, NV] },
    { name: "Greek Yogurt", category: "dairy", benefits: "Probiotics for gut health, protein for satiety, calcium for bones", pcosSuitability: { insulin_resistant: r, inflammatory: a, adrenal: n, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: n }, storePricing: sp("$5-8", "$4-7", "$4-6", "$3-5"), dietaryTags: [VG, P, NV] },
    { name: "Flaxseeds", category: "fat", benefits: "Lignans that help balance estrogen, rich in omega-3 fatty acids", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: n, luteal: r }, storePricing: sp("$5-8", "$4-7", "$3-5", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Dark Chocolate (85%+)", category: "other", benefits: "Magnesium-rich, reduces cravings and supports mood during luteal phase", pcosSuitability: { insulin_resistant: n, inflammatory: n, adrenal: r, post_pill: n }, cyclePhaseSuitability: { menstrual: r, follicular: n, ovulatory: n, luteal: r }, storePricing: sp("$4-7", "$3-6", "$3-5", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Bone Broth", category: "protein", benefits: "Collagen and amino acids that support gut lining and reduce inflammation", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: n, ovulatory: n, luteal: r }, storePricing: sp("$6-10", "$5-8", "$5-7", "$4-7"), dietaryTags: [P, NV] },
    { name: "Cauliflower", category: "vegetable", benefits: "Contains DIM for estrogen metabolism, low-carb alternative to grains", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$3-5", "$2-4", "$2-3", "$2-3"), dietaryTags: [V, VG, P, NV] },
    { name: "Pumpkin Seeds", category: "fat", benefits: "Zinc for hormone balance, magnesium for stress reduction", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: n, ovulatory: r, luteal: r }, storePricing: sp("$6-9", "$5-8", "$4-7", "$4-6"), dietaryTags: [V, VG, P, NV] },
    { name: "Sardines", category: "protein", benefits: "High in omega-3, vitamin D and calcium for bone and hormone health", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: n, luteal: r }, storePricing: sp("$3-5", "$2-4", "$2-4", "$2-3"), dietaryTags: [P, NV] },
    { name: "Apple Cider Vinegar", category: "other", benefits: "Supports insulin sensitivity and digestive health", pcosSuitability: { insulin_resistant: r, inflammatory: n, adrenal: n, post_pill: n }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: n, luteal: n }, storePricing: sp("$5-8", "$4-7", "$3-5", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Almonds", category: "fat", benefits: "Vitamin E and healthy fats support skin health and hormone balance", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: n, luteal: r }, storePricing: sp("$8-12", "$7-10", "$6-9", "$5-8"), dietaryTags: [V, VG, P, NV] },
    { name: "Salmon (Canned)", category: "protein", benefits: "Affordable omega-3 source with calcium from bones", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$4-6", "$3-5", "$3-5", "$2-4"), dietaryTags: [P, NV] },
    { name: "Brussels Sprouts", category: "vegetable", benefits: "DIM compound supports estrogen metabolism, high in vitamin C", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$4-6", "$3-5", "$3-5", "$2-4"), dietaryTags: [V, VG, P, NV] },
    { name: "Coconut Oil", category: "fat", benefits: "Medium-chain fatty acids support metabolism and thyroid function", pcosSuitability: { insulin_resistant: n, inflammatory: n, adrenal: r, post_pill: n }, cyclePhaseSuitability: { menstrual: r, follicular: n, ovulatory: n, luteal: r }, storePricing: sp("$7-12", "$6-10", "$5-8", "$5-8"), dietaryTags: [V, VG, P, NV] },
    { name: "Tempeh", category: "protein", benefits: "Fermented soy protein with probiotics, supports gut and hormone health", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: n, post_pill: n }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: n }, storePricing: sp("$4-6", "$3-5", "$2-4", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Raspberries", category: "fruit", benefits: "Low-sugar berry with fiber and ellagic acid for anti-inflammatory support", pcosSuitability: { insulin_resistant: r, inflammatory: r, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: r, follicular: r, ovulatory: r, luteal: r }, storePricing: sp("$5-8", "$4-7", "$3-5", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Maca Root Powder", category: "other", benefits: "Adaptogenic herb that supports hormone balance and energy", pcosSuitability: { insulin_resistant: r, inflammatory: n, adrenal: r, post_pill: r }, cyclePhaseSuitability: { menstrual: n, follicular: r, ovulatory: r, luteal: n }, storePricing: [{ store: "Whole Foods", priceRange: "$12-18", available: true }, { store: "Sprouts", priceRange: "$10-15", available: true }, { store: "Trader Joe's", priceRange: "$8-12", available: false }, { store: "Walmart", priceRange: "$8-14", available: true }], dietaryTags: [V, VG, P, NV] },
    { name: "Processed Sugar", category: "other", benefits: "Spikes blood sugar and worsens insulin resistance", pcosSuitability: { insulin_resistant: a, inflammatory: a, adrenal: a, post_pill: a }, cyclePhaseSuitability: { menstrual: a, follicular: a, ovulatory: a, luteal: a }, storePricing: sp("$3-5", "$3-4", "$2-4", "$2-3"), dietaryTags: [V, VG, P, NV] },
    { name: "White Bread", category: "grain", benefits: "High glycemic index, spikes insulin levels", pcosSuitability: { insulin_resistant: a, inflammatory: a, adrenal: n, post_pill: n }, cyclePhaseSuitability: { menstrual: a, follicular: a, ovulatory: n, luteal: a }, storePricing: sp("$4-6", "$3-5", "$2-4", "$2-3"), dietaryTags: [VG, P, NV] },
    { name: "Soda", category: "beverage", benefits: "High sugar content worsens insulin resistance and inflammation", pcosSuitability: { insulin_resistant: a, inflammatory: a, adrenal: a, post_pill: a }, cyclePhaseSuitability: { menstrual: a, follicular: a, ovulatory: a, luteal: a }, storePricing: sp("$5-8", "$5-7", "$4-6", "$3-5"), dietaryTags: [V, VG, P, NV] },
    { name: "Fried Foods", category: "other", benefits: "Trans fats increase inflammation and worsen hormonal imbalance", pcosSuitability: { insulin_resistant: a, inflammatory: a, adrenal: a, post_pill: a }, cyclePhaseSuitability: { menstrual: a, follicular: a, ovulatory: a, luteal: a }, storePricing: sp("$5-10", "$4-8", "$4-7", "$3-6"), dietaryTags: [NV] },
  ];

  for (const food of foods) {
    await storage.createGroceryItem({
      name: food.name,
      category: food.category,
      benefits: food.benefits,
      pcosSuitability: food.pcosSuitability,
      cyclePhaseSuitability: food.cyclePhaseSuitability,
      storePricing: food.storePricing,
      dietaryTags: food.dietaryTags,
    });
  }
}
