import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";

export const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function isConvexConfigured(): boolean {
  return !!convexUrl && convexUrl.length > 0;
}
