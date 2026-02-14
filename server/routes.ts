import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import OpenAI from "openai";
import { generateMealPlan } from "./minimax";

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
    
    // Ensure userId matches auth
    if (input.userId !== userId) {
      // Force override userId to authenticated user for safety
      // But actually the schema input might expect userId. 
      // Ideally we shouldn't trust client userId, but for now we'll just use the auth one.
    }
    
    const profile = await storage.createOrUpdatePcosProfile({
      ...input,
      userId // Override with authenticated user
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

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.searchGroceryItems();
  if (existing.length > 0) return;

  const foods = [
    { name: "Wild Salmon", category: "protein" },
    { name: "Spinach", category: "vegetable" },
    { name: "Berries", category: "fruit" },
    { name: "Quinoa", category: "grain" },
    { name: "Avocado", category: "fat" },
    { name: "Turmeric", category: "spice" },
    { name: "Green Tea", category: "beverage" },
  ];

  for (const food of foods) {
    await storage.createGroceryItem({
      name: food.name,
      category: food.category,
      benefits: "Anti-inflammatory",
      pcosSuitability: {},
      cyclePhaseSuitability: {}
    });
  }
}
