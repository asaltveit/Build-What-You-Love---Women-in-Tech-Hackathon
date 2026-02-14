# Bloom - PCOS Cycle Care App

## Overview

Bloom is a holistic cycle care application for women with PCOS (Polycystic Ovary Syndrome). It helps users track their menstrual cycle, detect their PCOS type via AI analysis, receive personalized daily meal plans and exercise recommendations based on cycle phase and PCOS type, log daily symptoms (including voice input), and manage grocery lists with real-time syncing.

The app follows a monorepo structure with a React frontend, Express.js backend, PostgreSQL database via Drizzle ORM, and integrates multiple AI services and Convex for real-time features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript, built with Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state; local React state for UI
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives, with custom `Card` and `Layout` wrapper components
- **Styling**: TailwindCSS with CSS custom properties for theming (sage green primary, lavender secondary, pink accent). Fonts are Inter (body) and Playfair Display (display headings)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (server/)
- **Framework**: Express.js with TypeScript, running on Node via tsx
- **API Pattern**: REST endpoints defined in `server/routes.ts`, with typed route contracts in `shared/routes.ts` using Zod schemas
- **Authentication**: Replit OIDC Auth via OpenID Connect + Passport.js. Sessions stored in PostgreSQL via `connect-pg-simple`. Auth middleware via `isAuthenticated`. Mandatory tables: `users` and `sessions`
- **Build**: Vite builds the client to `dist/public`; esbuild bundles the server to `dist/index.cjs` for production

### Database
- **Engine**: PostgreSQL (Neon-backed on Replit), connection via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations (`db:push` command)
- **Schema location**: `shared/schema.ts` (main tables), `shared/models/auth.ts` (users/sessions), `shared/models/chat.ts` (conversations/messages)
- **Key tables**:
  - `users` - Replit Auth user records (mandatory, do not drop)
  - `sessions` - Session storage (mandatory, do not drop)
  - `pcos_profiles` - User PCOS type, cycle length, last period dates, symptoms
  - `daily_logs` - Daily symptom/mood/energy logs with cycle day
  - `grocery_items` - Grocery items with PCOS suitability ratings and store pricing
  - `conversations` / `messages` - Chat history for AI conversations

### AI Integrations
- **OpenAI (via Replit AI Integrations)**: Used for PCOS type analysis. Configured with `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables
- **Minimax AI - Meal Plans** (`server/minimax.ts`): Uses OpenAI-compatible client pointed at `api.minimax.chat/v1` for generating weekly meal plans personalized to PCOS type and cycle phase. Requires `MINIMAX_API_KEY`
- **Minimax AI - Voice STT** (`server/minimax-stt.ts`): Speech-to-text transcription for voice symptom logging. Audio recorded on frontend via Web Audio API/MediaRecorder, sent as multipart to server, transcribed via Minimax audio transcription API

### Real-time Features (Convex)
- **Purpose**: Real-time grocery list syncing across devices
- **Schema**: Defined in `convex/schema.ts` with `groceryLists` and `groceryListItems` tables
- **Client**: `ConvexReactClient` initialized in `client/src/lib/convex.ts` using `VITE_CONVEX_URL` environment variable
- **Fallback**: If Convex URL is not configured, the app falls back to local state management
- **Deployment**: Convex backend runs in Convex's cloud; only the URL is needed on Replit (no need to run `convex dev` on Replit)

### Key Pages
- **AuthPage**: Replit OIDC login with branded hero section
- **Onboarding**: Multi-step PCOS analysis wizard that determines PCOS type via AI
- **Dashboard**: Cycle tracker ring visualization, daily recommendations, quick actions
- **Log**: Daily symptom/mood/energy logging with calendar, voice recording support
- **MealPlan**: AI-generated weekly meal plans with grocery list integration
- **Groceries**: Grocery search with PCOS suitability ratings, real-time Convex grocery lists
- **Profile**: Edit PCOS type, cycle length, period dates

### API Routes
- `POST /api/pcos/analyze` - AI-powered PCOS type detection from symptoms
- `GET /api/pcos/profile` - Get user's PCOS profile
- `POST /api/pcos/profile` - Create/update PCOS profile
- `GET /api/logs` - Get user's daily logs
- `POST /api/logs` - Create daily log entry
- `GET /api/groceries/search` - Search grocery items with suitability info
- `POST /api/meal-plan/weekly` - Generate weekly meal plan via Minimax AI
- `POST /api/voice/transcribe` - Transcribe voice audio via Minimax STT
- `GET /api/auth/user` - Get current authenticated user
- `/api/login`, `/api/logout` - Replit Auth login/logout redirects

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned on Replit)
- `SESSION_SECRET` - Express session secret
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (via Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (via Replit AI Integrations)
- `MINIMAX_API_KEY` - Minimax AI API key for meal plan generation and voice STT
- `MINIMAX_GROUP_ID` - Minimax group ID (for STT)
- `VITE_CONVEX_URL` - Convex deployment URL (optional; grocery lists fall back to local state without it)
- `REPL_ID` - Auto-set by Replit, used for OIDC auth
- `ISSUER_URL` - OIDC issuer URL (defaults to `https://replit.com/oidc`)

### Third-Party Services
- **PostgreSQL (Neon)** - Primary database via Replit's provisioned Postgres
- **Replit OIDC** - Authentication provider
- **OpenAI API** - PCOS analysis AI (via Replit AI Integrations proxy)
- **Minimax AI** (`api.minimax.chat`) - Meal plan generation and voice-to-text transcription
- **Convex** - Real-time database for grocery list syncing (runs in Convex cloud)

### Key npm Packages
- `drizzle-orm` + `drizzle-kit` - Database ORM and migrations
- `openai` - OpenAI client SDK (used for both OpenAI and Minimax via baseURL override)
- `convex` - Convex real-time client and server SDK
- `@tanstack/react-query` - Server state management
- `wouter` - Client-side routing
- `framer-motion` - Animations
- `date-fns` - Date utilities for cycle calculations
- `zod` - Schema validation for API contracts
- `passport` + `openid-client` - OIDC authentication
- `multer` - Multipart file upload handling (voice audio)
- `shadcn/ui` components via Radix UI primitives