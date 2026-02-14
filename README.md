# Bloom - PCOS Cycle Care App

## Overview
A holistic cycle care application for women with PCOS. The app helps users plan meals and exercise based on their menstrual cycle phase and PCOS type. Features PCOS type detection, personalized daily recommendations, AI-powered meal planning, and smart grocery lists.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon-backed via Replit)
- **ORM**: Drizzle
- **Auth**: Replit OIDC Auth
- **AI**: OpenAI (for PCOS analysis), Minimax AI (for meal plan generation)
- **Real-time**: Convex (for live grocery list syncing)
- **Styling**: TailwindCSS utility classes

## Project Structure
```
client/src/
  pages/          - Route pages (Dashboard, MealPlan, Groceries, Log, Profile, Onboarding, AuthPage)
  components/     - Reusable components (CycleTracker, MealPlanCard, RecommendationCards, ConvexGroceryList)
  components/ui/  - shadcn components + Layout
  hooks/          - Custom hooks (use-auth, use-pcos, use-logs, use-groceries)
  styles/         - Global styles
  lib/            - Utilities (queryClient, convex)
server/
  routes.ts       - API routes
  storage.ts      - Database storage interface
  minimax.ts      - Minimax AI client for meal plans
  replit_integrations/ - Auth & AI integrations
shared/
  schema.ts       - Drizzle DB schema
  routes.ts       - API route definitions
convex/
  schema.ts       - Convex schema for real-time grocery lists
  groceryLists.ts - Convex mutations/queries
```

## Key Integrations
1. **Minimax AI - Meal Plans** (`server/minimax.ts`): OpenAI-compatible API at `api.minimax.chat` for personalized meal plan generation. Requires `MINIMAX_API_KEY`.
2. **Minimax AI - Voice STT** (`server/minimax-stt.ts`): Speech-to-text transcription for voice symptom input. Uses Minimax audio transcription API. Audio recorded via Web Audio API on frontend, sent as multipart form data.
3. **Convex** (`convex/`): Real-time grocery list syncing. Requires `VITE_CONVEX_URL`. Falls back to local state.

### Convex on Replit (deploy from GitHub)
- **Local setup**: Copy `.env.example` to `.env.local`, run `npx convex dev` to link/create a Convex project, then set `VITE_CONVEX_URL` in `.env.local` to the URL Convex prints (or from [dashboard.convex.dev](https://dashboard.convex.dev)).
- **Replit**: So the deployed app uses Convex, add a **Secret** in Replit: **Tools → Secrets** → add `VITE_CONVEX_URL` with your Convex deployment URL (same as local). Vite bakes this into the client at build time, so the secret must be set before Replit runs the build (e.g. before the first deploy after pushing from GitHub).
- Convex backend runs in Convex’s cloud; Replit only needs the URL. No need to run `convex dev` or `convex deploy` on Replit.

## API Routes
- `POST /api/pcos/analyze` - AI-powered PCOS type detection
- `GET/POST /api/pcos/profile` - PCOS profile CRUD (includes lastPeriodEndDate)
- `GET /api/logs` / `POST /api/logs` - Daily symptom logs
- `GET /api/recommendations/today` - Cycle-phase recommendations
- `GET /api/groceries/search` - Personalized grocery search (returns suitability rating based on PCOS type + cycle phase, store pricing for 4 retailers)
- `POST /api/meal-plan/generate` - Minimax-powered 7-day weekly meal plan generation with cycle phase progression
- `POST /api/voice/transcribe` - Voice-to-text symptom input (multipart audio upload)

## Grocery System
- 35+ seeded grocery items with PCOS suitability (per type) and cycle phase suitability ratings
- Store pricing data for Whole Foods, Sprouts, Trader Joe's, and Walmart (estimated price ranges)
- Search results personalized by user's PCOS type and current cycle phase
- Suitability filtering (recommended/neutral/avoid)
- Dietary restriction filtering (vegan/vegetarian/pescatarian/non-vegetarian)
- `StorePricing` interface: `{ store: string, priceRange: string, available: boolean }`
- `DietaryTag` type: `"vegan" | "vegetarian" | "pescatarian" | "non_vegetarian"`
- Each grocery item has a `dietaryTags` jsonb array for multi-diet tagging

## Weekly Meal Plan
- `generateWeeklyMealPlan()` in `server/minimax.ts` generates 7-day plans
- Each day includes phase-appropriate meals (breakfast, lunch, dinner, snacks)
- Cycle phase progresses across the 7 days based on current cycle day
- Frontend shows day selector tabs with phase badges per day
- Falls back to default phase-based meals if AI fails

## Recent Changes
- Upgraded meal plan from daily to 7-day weekly format with cycle phase progression
- Added period end date tracking to profile (lastPeriodEndDate field)
- Expanded grocery database to 35+ items with store pricing for 4 major retailers
- Personalized grocery search ranks items by combined PCOS type + cycle phase suitability
- Added suitability filter buttons (recommended/neutral/avoid) on Groceries page
- Added voice-based symptom input using Minimax STT on the Log page
- VoiceRecorder component with real-time audio visualization
- Added Convex real-time grocery list support
- Added dietary restriction filtering (vegan, vegetarian, pescatarian, non-vegetarian) to grocery items with filter UI and per-card diet badges
- Removed BEM CSS methodology, converted all component styles to Tailwind utility classes
