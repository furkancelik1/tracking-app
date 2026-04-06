PROJECT_SPEC.md: SaaS Productivity & Routine Tracker
1. Project Vision
A high-performance SaaS tool where users curate a daily routine from a global action catalogue. The core value is real-time tracking, smart timer-based resets, and a seamless dashboard experience that scales efficiently.

2. Tech Stack (Strict Requirements)
Framework: Next.js 14+ (App Router)

Language: TypeScript (Strict mode)

Database: MySQL (Hosted on PlanetScale or similar)

ORM: Prisma

Real-time: Supabase Realtime (via Broadcast channel for MySQL sync)

Authentication: NextAuth.js or Clerk (Google + Email)

Styling: Tailwind CSS + Shadcn UI

State Management: TanStack Query (React Query) for server state.

3. Database Schema (Prisma)
Claude should implement the following core models:

User: Profile, subscription tier (FREE/PRO), stripeId.

Card (Catalogue Action): Title, description, content (markdown/HTML), category, affiliateUrl, resetType (ROLLING/FIXED), duration (seconds).

BasketItem: Links User to Card. Status (PENDING, ACTIVE, COMPLETED), lastActivatedAt, nextResetAt.

ActivityLog: Efficient, non-blocking logs for user history and reward tracking.

4. Core Logic & Features
A. Dual-Timer Logic
Rolling Timer: Triggered on activation. nextResetAt = now + card.duration.

Fixed Reset: Triggers at a specific time (e.g., 00:00 local time). nextResetAt = startOfNextDay().

Automation: When currentTime > nextResetAt, the BasketItem status must automatically revert to PENDING (UI must reflect this instantly via Supabase).

B. Real-time Dashboard
Live Updates: Use Supabase Broadcast to push status changes from Server to Client without polling the MySQL DB.

Forecasting: A panel showing "Expected Completion" times based on the user's current basket and timer states.

C. Admin Management
A protected /admin route to Create/Read/Update/Delete (CRUD) cards in the catalogue.

Content must be updateable without code changes.

D. API Architecture (Phase 2 Ready)
All business logic must reside in src/app/api/v1/*.

Stateless Auth: Use JWT/Session tokens that a Chrome Extension can easily pass in headers.

CORS: Pre-configure CORS to allow future extension origins.

5. Folder Structure
Plaintext
/src
  /app
    /(auth)          # Login/Register
    /(dashboard)     # Protected user routes
    /admin           # Admin management
    /api/v1          # Versioned API for Web & Extension
  /components
    /ui              # Shadcn components
    /dashboard       # Dashboard specific components
    /shared          # Reusable components
  /hooks             # useTimer, useRealtime, etc.
  /lib
    /prisma.ts       # Database client
    /supabase.ts     # Realtime client
    /utils.ts        # Helper functions (time calculation)
  /services          # Business logic (Timer calculations, Affiliate tracking)
  /types             # TypeScript interfaces
6. Implementation Instructions for Claude Code
Step 1: Initialize the project with the specified folder structure and install dependencies.

Step 2: Setup Prisma with MySQL and generate the schema.

Step 3: Build the Auth system (Google + Email).

Step 4: Create the Admin CRUD for the Action Catalogue.

Step 5: Build the "Basket" logic (Adding cards from catalogue to user dashboard).

Step 6: Implement the Timer Engine (The core logic for Rolling vs Fixed resets).

Step 7: Integrate Supabase Realtime for "No-Refresh" status updates.

Step 8: Build the affiliate tracking redirect system.

7. Performance & Scaling Rules
No Over-fetching: Use Prisma select to only fetch necessary fields.

Caching: Implement revalidateTag for catalogue updates.

Logging: User activity logs should be batched or handled via edge functions to prevent DB bottlenecks.

UI: Ensure all timer-heavy components are optimized to prevent unnecessary re-renders.