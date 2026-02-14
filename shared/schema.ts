import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Export Auth & Chat models
export * from "./models/auth";
export * from "./models/chat";

// === PCOS & CYCLE TABLES ===

export const pcosProfiles = pgTable("pcos_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  pcosType: text("pcos_type").notNull(), // 'insulin_resistant', 'inflammatory', 'adrenal', 'post_pill', 'unknown'
  cycleLength: integer("cycle_length").default(28).notNull(),
  lastPeriodDate: date("last_period_date").notNull(),
  symptoms: jsonb("symptoms").$type<string[]>().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  cycleDay: integer("cycle_day").notNull(), // 1-28+
  symptoms: jsonb("symptoms").$type<string[]>().default([]),
  energyLevel: integer("energy_level"), // 1-10
  mood: text("mood"),
  notes: text("notes"),
});

export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'protein', 'vegetable', 'fruit', 'grain', 'fat', 'other'
  benefits: text("benefits"),
  pcosSuitability: jsonb("pcos_suitability").$type<Record<string, "recommended" | "avoid" | "neutral">>(),
  cyclePhaseSuitability: jsonb("cycle_phase_suitability").$type<Record<string, "recommended" | "avoid" | "neutral">>(),
});

// === SCHEMAS ===

const fullInsertPcosProfileSchema = createInsertSchema(pcosProfiles).omit({ 
  id: true, 
  updatedAt: true 
});

export const insertPcosProfileSchema = fullInsertPcosProfileSchema.omit({
  userId: true
});

const fullInsertDailyLogSchema = createInsertSchema(dailyLogs).omit({ 
  id: true 
});

export const insertDailyLogSchema = fullInsertDailyLogSchema.omit({
  userId: true
});

export const insertGroceryItemSchema = createInsertSchema(groceryItems).omit({
  id: true
});

// === TYPES ===

export type PcosProfile = typeof pcosProfiles.$inferSelect;
export type InsertPcosProfile = z.infer<typeof insertPcosProfileSchema>;
export type InsertPcosProfileWithUser = z.infer<typeof fullInsertPcosProfileSchema>;

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type InsertDailyLogWithUser = z.infer<typeof fullInsertDailyLogSchema>;

export type GroceryItem = typeof groceryItems.$inferSelect;
export type InsertGroceryItem = z.infer<typeof insertGroceryItemSchema>;

export type PcosType = 'insulin_resistant' | 'inflammatory' | 'adrenal' | 'post_pill' | 'unknown';
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface PcosAnalysisRequest {
  symptoms: string[];
  cycleRegularity: 'regular' | 'irregular' | 'absent';
  weightConcerns: boolean;
  hairGrowth: boolean;
  acne: boolean;
  fatigue: boolean;
}

export interface PcosAnalysisResponse {
  detectedType: PcosType;
  confidence: number;
  explanation: string;
  recommendations: string[];
}

export interface DailyRecommendation {
  phase: CyclePhase;
  nutrition: {
    focus: string;
    foodsToEat: string[];
    foodsToAvoid: string[];
  };
  exercise: {
    focus: string;
    recommendedTypes: string[];
    intensity: 'low' | 'medium' | 'high';
  };
  lifestyle: string;
}
