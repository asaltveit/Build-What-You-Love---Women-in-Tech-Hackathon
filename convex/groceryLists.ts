import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserLists = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const lists = await ctx.db
      .query("groceryLists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return lists;
  },
});

export const getListItems = query({
  args: { listId: v.id("groceryLists") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("groceryListItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    return items;
  },
});

export const createList = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    cyclePhase: v.string(),
    pcosType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const listId = await ctx.db.insert("groceryLists", {
      userId: args.userId,
      name: args.name,
      cyclePhase: args.cyclePhase,
      pcosType: args.pcosType,
      createdAt: now,
      updatedAt: now,
    });
    return listId;
  },
});

export const deleteList = mutation({
  args: { listId: v.id("groceryLists") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("groceryListItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.listId);
  },
});

export const addItem = mutation({
  args: {
    listId: v.id("groceryLists"),
    userId: v.string(),
    name: v.string(),
    category: v.string(),
    quantity: v.number(),
    unit: v.string(),
    isRecommended: v.boolean(),
    isWarned: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const itemId = await ctx.db.insert("groceryListItems", {
      listId: args.listId,
      userId: args.userId,
      name: args.name,
      category: args.category,
      quantity: args.quantity,
      unit: args.unit,
      checked: false,
      isRecommended: args.isRecommended,
      isWarned: args.isWarned,
      reason: args.reason,
      addedAt: Date.now(),
    });
    await ctx.db.patch(args.listId, { updatedAt: Date.now() });
    return itemId;
  },
});

export const toggleItem = mutation({
  args: { itemId: v.id("groceryListItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (item) {
      await ctx.db.patch(args.itemId, { checked: !item.checked });
    }
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("groceryListItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (item) {
      await ctx.db.patch(item.listId, { updatedAt: Date.now() });
      await ctx.db.delete(args.itemId);
    }
  },
});
