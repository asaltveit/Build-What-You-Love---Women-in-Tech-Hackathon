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
- **Styling**: BEM methodology for custom component styles

## Project Structure
```
client/src/
  pages/          - Route pages (Dashboard, MealPlan, Groceries, Log, Profile, Onboarding, AuthPage)
  components/     - Reusable components (CycleTracker, MealPlanCard, RecommendationCards, ConvexGroceryList)
  components/ui/  - shadcn components + Layout
  hooks/          - Custom hooks (use-auth, use-pcos, use-logs, use-groceries)
  styles/         - BEM component styles (bem-components.css)
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
3. **BEM CSS** (`client/src/styles/bem-components.css`): Block-Element-Modifier methodology for CycleTracker, RecommendationCards, MealPlanCard, GroceryItem, PcosBadge blocks.
4. **Convex** (`convex/`): Real-time grocery list syncing. Requires `VITE_CONVEX_URL`. Falls back to local state.

## API Routes
- `POST /api/pcos/analyze` - AI-powered PCOS type detection
- `GET/POST /api/pcos/profile` - PCOS profile CRUD
- `GET /api/logs` / `POST /api/logs` - Daily symptom logs
- `GET /api/recommendations/today` - Cycle-phase recommendations
- `GET /api/groceries/search` - Grocery search with location
- `POST /api/meal-plan/generate` - Minimax-powered meal plan generation
- `POST /api/voice/transcribe` - Voice-to-text symptom input (multipart audio upload)

## Recent Changes
- Added voice-based symptom input using Minimax STT on the Log page
- VoiceRecorder component with real-time audio visualization
- Auto-parses transcribed text into symptoms, mood, and notes
- Added Minimax AI integration for personalized meal plan generation
- Added BEM CSS methodology for custom component styling
- Added Convex real-time grocery list support
- Created CycleTracker, MealPlanCard, RecommendationCards, ConvexGroceryList components
- Added Meal Plan page with AI generation and grocery list integration
