import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import OpenAI from "openai";
import { generateMealPlan } from "./minimax";
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

    // Determine phase (Mock logic: based on last period + today)
    // In a real app, calculate based on cycle length
    const today = new Date();
    const lastPeriod = new Date(profile.lastPeriodDate);
    const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 3600 * 24)) % profile.cycleLength;
    
    let phase = "follicular";
    if (diffDays < 5) phase = "menstrual";
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

  // 5. Groceries Search
  app.get(api.groceries.search.path, isAuthenticated, async (req: any, res) => {
    const { query, location } = req.query;
    
    // Search DB
    const items = await storage.searchGroceryItems(query as string);
    
    // Mock "Near Me" by adding random store data
    const results = items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      isRecommended: true, // Logic to check against user profile/phase could go here
      store: ["Whole Foods", "Trader Joe's", "Local Market"][Math.floor(Math.random() * 3)],
      distance: `${(Math.random() * 5).toFixed(1)} miles`,
      price: `$${(Math.random() * 10 + 2).toFixed(2)}`
    }));

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

    let phase = "follicular";
    if (diffDays < 5) phase = "menstrual";
    else if (diffDays < 14) phase = "follicular";
    else if (diffDays < 17) phase = "ovulatory";
    else phase = "luteal";

    try {
      const mealPlan = await generateMealPlan({
        pcosType: profile.pcosType,
        cyclePhase: phase,
        cycleDay: diffDays,
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

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.searchGroceryItems();
  if (existing.length > 7) return;

  const foods = [
    { name: "Wild Salmon", category: "protein", benefits: "Rich in omega-3 fatty acids, reduces inflammation and supports hormone balance", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Spinach", category: "vegetable", benefits: "High in iron and folate, essential during menstruation and for hormone production", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Blueberries", category: "fruit", benefits: "Packed with antioxidants that fight inflammation and support insulin sensitivity", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Quinoa", category: "grain", benefits: "Complete protein with low glycemic index, stabilizes blood sugar", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "neutral" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Avocado", category: "fat", benefits: "Healthy monounsaturated fats support hormone production and reduce inflammation", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Turmeric", category: "spice", benefits: "Powerful anti-inflammatory that helps manage PCOS symptoms", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "neutral" as const, post_pill: "neutral" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "neutral" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Green Tea", category: "beverage", benefits: "Contains EGCG which improves insulin sensitivity and supports weight management", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "avoid" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "neutral" as const } },
    { name: "Sweet Potato", category: "vegetable", benefits: "Complex carbs with low GI, rich in vitamin A for hormone health", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "neutral" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Walnuts", category: "fat", benefits: "Omega-3s and healthy fats that reduce androgens and improve insulin response", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Lentils", category: "protein", benefits: "Plant protein with fiber that stabilizes blood sugar and supports gut health", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "neutral" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Broccoli", category: "vegetable", benefits: "Contains DIM which helps metabolize excess estrogen, supports detoxification", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Chia Seeds", category: "fat", benefits: "High in omega-3 and fiber, helps stabilize blood sugar levels", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Eggs", category: "protein", benefits: "Complete protein with choline for hormone support, vitamin D for fertility", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "neutral" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Ginger", category: "spice", benefits: "Anti-inflammatory, eases menstrual cramps and supports digestion", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "neutral" as const, post_pill: "neutral" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "neutral" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Chicken Breast", category: "protein", benefits: "Lean protein that supports muscle repair and hormone production", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "neutral" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Kale", category: "vegetable", benefits: "Nutrient-dense with calcium, vitamin K, supports detoxification", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Cinnamon", category: "spice", benefits: "Improves insulin sensitivity and helps regulate blood sugar levels", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "neutral" as const, adrenal: "neutral" as const, post_pill: "neutral" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Greek Yogurt", category: "dairy", benefits: "Probiotics for gut health, protein for satiety, calcium for bones", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "avoid" as const, adrenal: "neutral" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "neutral" as const } },
    { name: "Flaxseeds", category: "fat", benefits: "Lignans that help balance estrogen, rich in omega-3 fatty acids", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Dark Chocolate (85%+)", category: "other", benefits: "Magnesium-rich, reduces cravings and supports mood during luteal phase", pcosSuitability: { insulin_resistant: "neutral" as const, inflammatory: "neutral" as const, adrenal: "recommended" as const, post_pill: "neutral" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "neutral" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Bone Broth", category: "protein", benefits: "Collagen and amino acids that support gut lining and reduce inflammation", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "neutral" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Cauliflower", category: "vegetable", benefits: "Contains DIM for estrogen metabolism, low-carb alternative to grains", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Pumpkin Seeds", category: "fat", benefits: "Zinc for hormone balance, magnesium for stress reduction", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "neutral" as const, ovulatory: "recommended" as const, luteal: "recommended" as const } },
    { name: "Sardines", category: "protein", benefits: "High in omega-3, vitamin D and calcium for bone and hormone health", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "recommended" as const, adrenal: "recommended" as const, post_pill: "recommended" as const }, cyclePhaseSuitability: { menstrual: "recommended" as const, follicular: "recommended" as const, ovulatory: "neutral" as const, luteal: "recommended" as const } },
    { name: "Apple Cider Vinegar", category: "other", benefits: "Supports insulin sensitivity and digestive health", pcosSuitability: { insulin_resistant: "recommended" as const, inflammatory: "neutral" as const, adrenal: "neutral" as const, post_pill: "neutral" as const }, cyclePhaseSuitability: { menstrual: "neutral" as const, follicular: "recommended" as const, ovulatory: "neutral" as const, luteal: "neutral" as const } },
    { name: "Processed Sugar", category: "other", benefits: "Spikes blood sugar and worsens insulin resistance", pcosSuitability: { insulin_resistant: "avoid" as const, inflammatory: "avoid" as const, adrenal: "avoid" as const, post_pill: "avoid" as const }, cyclePhaseSuitability: { menstrual: "avoid" as const, follicular: "avoid" as const, ovulatory: "avoid" as const, luteal: "avoid" as const } },
    { name: "White Bread", category: "grain", benefits: "High glycemic index, spikes insulin levels", pcosSuitability: { insulin_resistant: "avoid" as const, inflammatory: "avoid" as const, adrenal: "neutral" as const, post_pill: "neutral" as const }, cyclePhaseSuitability: { menstrual: "avoid" as const, follicular: "avoid" as const, ovulatory: "neutral" as const, luteal: "avoid" as const } },
    { name: "Soda", category: "beverage", benefits: "High sugar content worsens insulin resistance and inflammation", pcosSuitability: { insulin_resistant: "avoid" as const, inflammatory: "avoid" as const, adrenal: "avoid" as const, post_pill: "avoid" as const }, cyclePhaseSuitability: { menstrual: "avoid" as const, follicular: "avoid" as const, ovulatory: "avoid" as const, luteal: "avoid" as const } },
  ];

  for (const food of foods) {
    await storage.createGroceryItem({
      name: food.name,
      category: food.category,
      benefits: food.benefits,
      pcosSuitability: food.pcosSuitability,
      cyclePhaseSuitability: food.cyclePhaseSuitability,
    });
  }
}
