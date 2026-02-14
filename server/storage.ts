import { 
  pcosProfiles, dailyLogs, groceryItems,
  type PcosProfile, type InsertPcosProfile,
  type DailyLog, type InsertDailyLog,
  type GroceryItem, type InsertGroceryItem
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // PCOS Profiles
  getPcosProfile(userId: string): Promise<PcosProfile | undefined>;
  createOrUpdatePcosProfile(profile: InsertPcosProfile): Promise<PcosProfile>;

  // Daily Logs
  getDailyLogs(userId: string): Promise<DailyLog[]>;
  createDailyLog(log: InsertDailyLog): Promise<DailyLog>;

  // Groceries
  searchGroceryItems(query?: string): Promise<GroceryItem[]>;
  createGroceryItem(item: InsertGroceryItem): Promise<GroceryItem>;
}

export class DatabaseStorage implements IStorage {
  async getPcosProfile(userId: string): Promise<PcosProfile | undefined> {
    const [profile] = await db.select().from(pcosProfiles).where(eq(pcosProfiles.userId, userId));
    return profile;
  }

  async createOrUpdatePcosProfile(profile: InsertPcosProfile): Promise<PcosProfile> {
    const [existing] = await db.select().from(pcosProfiles).where(eq(pcosProfiles.userId, profile.userId));
    
    if (existing) {
      const [updated] = await db
        .update(pcosProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(pcosProfiles.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(pcosProfiles).values(profile).returning();
    return created;
  }

  async getDailyLogs(userId: string): Promise<DailyLog[]> {
    return db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, userId))
      .orderBy(desc(dailyLogs.date));
  }

  async createDailyLog(log: InsertDailyLog): Promise<DailyLog> {
    const [created] = await db.insert(dailyLogs).values(log).returning();
    return created;
  }

  async searchGroceryItems(query?: string): Promise<GroceryItem[]> {
    if (!query) return db.select().from(groceryItems).limit(20);
    
    // Simple naive search for MVP
    const all = await db.select().from(groceryItems);
    return all.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) || 
      item.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  async createGroceryItem(item: InsertGroceryItem): Promise<GroceryItem> {
    const [created] = await db.insert(groceryItems).values(item).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
