import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  groceryLists: defineTable({
    userId: v.string(),
    name: v.string(),
    cyclePhase: v.string(),
    pcosType: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  groceryListItems: defineTable({
    listId: v.id("groceryLists"),
    userId: v.string(),
    name: v.string(),
    category: v.string(),
    quantity: v.number(),
    unit: v.string(),
    checked: v.boolean(),
    isRecommended: v.boolean(),
    isWarned: v.boolean(),
    reason: v.optional(v.string()),
    addedAt: v.number(),
  }).index("by_list", ["listId"]),
});
