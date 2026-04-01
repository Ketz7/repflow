# Coaching Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium coaching layer to RepFlow with coach roles, client management, macro targets, program assignments, ToS, and workout session UX fixes.

**Architecture:** Separate `coach_profiles` table extends users into coaches (Approach B). New junction tables for coach-client relationships, macro targets, and program assignments. RLS policies gate coach access to client data. In-app ToS acceptance with versioned documents.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS v4, Framer Motion

**Spec:** `docs/superpowers/specs/2026-04-01-coaching-platform-design.md`

---

## Task 1: Workout Session — Fix Column Alignment & Remove Swipe

**Files:**
- Modify: `src/app/session/[id]/page.tsx`

- [ ] **Step 1: Fix the grid column template**

In `src/app/session/[id]/page.tsx`, replace the header grid and set row grid with fixed widths.

Change the header row (around line 269):
```tsx
// OLD:
<div className="grid grid-cols-[40px_1fr_1fr_48px] gap-2 px-2 text-xs text-subtext">

// NEW:
<div className="grid grid-cols-[36px_72px_1fr_44px] gap-2 px-2 text-xs text-subtext">
```

Change each set row (around line 279):
```tsx
// OLD:
className={`grid grid-cols-[40px_1fr_1fr_48px] gap-2 items-center p-2 rounded-xl transition-colors ${

// NEW:
className={`grid grid-cols-[36px_72px_1fr_44px] gap-2 items-center p-2 rounded-xl transition-colors ${
```

- [ ] **Step 2: Remove swipe touch handlers**

Remove the `touchStartX` ref (line 47):
```tsx
// DELETE this line:
const touchStartX = useRef<number>(0);
```

Remove `handleTouchStart` and `handleTouchEnd` functions (lines 100-113):
```tsx
// DELETE these two functions entirely:
const handleTouchStart = (e: React.TouchEvent) => { ... };
const handleTouchEnd = (e: React.TouchEvent) => { ... };
```

Remove touch handlers from the container div (line 209):
```tsx
// OLD:
<div className="min-h-screen bg-background flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

// NEW:
<div className="min-h-screen bg-background flex flex-col">
```

- [ ] **Step 3: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/session/[id]/page.tsx
git commit -m "Fix workout session column alignment and remove swipe navigation

- Change grid to fixed widths [36px_72px_1fr_44px] for consistent alignment
- Remove touch swipe handlers that conflicted with input interaction
- Navigation via Prev/Next buttons and tappable indicator dots

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Workout Session — Exercise Swap

**Files:**
- Modify: `src/app/session/[id]/page.tsx`

- [ ] **Step 1: Add swap state and exercise loading**

At the top of the `SessionPage` component, add new state:
```tsx
const [showSwapModal, setShowSwapModal] = useState(false);
const [swapExercises, setSwapExercises] = useState<(Exercise & { muscle_group?: { name: string; icon: string } })[]>([]);
const [swapSearch, setSwapSearch] = useState("");
```

Add a function to load exercises for swapping:
```tsx
const openSwapModal = async () => {
  const supabase = createClient();
  const { data } = await supabase
    .from("exercises")
    .select("*, muscle_group:muscle_groups(name, icon)")
    .eq("is_approved", true)
    .order("name");
  setSwapExercises(data || []);
  setSwapSearch("");
  setShowSwapModal(true);
};

const handleSwapExercise = (newExercise: Exercise & { muscle_group?: { name: string; icon: string } }) => {
  setExercises((prev) =>
    prev.map((ex, i) =>
      i === currentIndex
        ? {
            ...ex,
            exercise_id: newExercise.id,
            exercise: newExercise,
            sets: ex.sets.map((s) => ({ ...s, completed: false, weight_used: null })),
          }
        : ex
    )
  );
  setShowSwapModal(false);
};
```

- [ ] **Step 2: Add swap icon next to exercise name**

In the exercise info section (around line 261), add a swap button next to the exercise name:
```tsx
<div className="mb-4">
  <div className="flex items-center gap-2 mb-1">
    <Badge>{current.exercise.muscle_group?.icon} {current.exercise.muscle_group?.name}</Badge>
    <span className="text-xs text-subtext">Exercise {currentIndex + 1} of {exercises.length}</span>
  </div>
  <div className="flex items-center gap-2">
    <h2 className="text-xl font-bold text-foreground flex-1">{current.exercise.name}</h2>
    <button
      onClick={openSwapModal}
      className="p-2 rounded-lg bg-surface border border-border text-subtext hover:text-primary transition-colors"
      title="Swap exercise"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    </button>
  </div>
  <p className="text-xs text-subtext mt-1">Target: {current.target_sets} × {current.target_reps}</p>
</div>
```

- [ ] **Step 3: Add the swap modal**

Add a bottom sheet modal before the closing `</div>` of the component (after the end session confirmation modal):

```tsx
{/* Exercise Swap Modal */}
{showSwapModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-full max-h-[80vh] bg-surface/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl flex flex-col"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Swap Exercise</h3>
        <button onClick={() => setShowSwapModal(false)} className="text-subtext hover:text-foreground p-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-4 pt-3 pb-2">
        <input
          type="text"
          placeholder="Search exercises..."
          value={swapSearch}
          onChange={(e) => setSwapSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {Object.entries(
          swapExercises
            .filter((e) => e.name.toLowerCase().includes(swapSearch.toLowerCase()))
            .reduce((groups, ex) => {
              const group = ex.muscle_group?.name || "Other";
              if (!groups[group]) groups[group] = [];
              groups[group].push(ex);
              return groups;
            }, {} as Record<string, typeof swapExercises>)
        ).map(([group, exs]) => (
          <div key={group} className="mb-4">
            <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-2">{group}</p>
            <div className="space-y-1">
              {exs.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => handleSwapExercise(ex)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    ex.id === current.exercise_id
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-foreground hover:bg-card"
                  }`}
                >
                  {ex.muscle_group?.icon} {ex.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  </div>
)}
```

- [ ] **Step 4: Add Exercise import to the file**

Ensure `Exercise` is imported at the top of the file:
```tsx
import type { WorkoutExercise, Exercise } from "@/types";
```
This import already exists — verify it includes `Exercise`.

- [ ] **Step 5: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/session/[id]/page.tsx
git commit -m "Add exercise swap during workout sessions

- Swap icon next to exercise name opens bottom sheet picker
- Exercise library grouped by muscle group with search
- Swap applies to current session only, does not modify program
- Swapped exercise resets set completion and weights

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Database Migration — Coaching Tables & RLS

**Files:**
- Create: `supabase/migrations/00006_coaching_platform.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/00006_coaching_platform.sql`:

```sql
-- RepFlow Coaching Platform
-- Migration: coach profiles, clients, macro targets, program assignments, subscriptions, agreements

-- ============================================
-- COACH PROFILES (extends users into coaches)
-- ============================================
create table public.coach_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  bio text not null default '',
  experience text not null default '',
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  max_clients integer not null default 25,
  monthly_rate decimal,
  created_at timestamptz not null default now()
);

alter table public.coach_profiles enable row level security;

-- Anyone can browse approved coaches
create policy "Approved coaches readable by all authenticated users"
  on public.coach_profiles for select
  to authenticated
  using (status = 'approved');

-- Coach can read own profile regardless of status
create policy "Coach can read own profile"
  on public.coach_profiles for select
  to authenticated
  using (user_id = auth.uid());

-- Any user can apply to be a coach
create policy "Users can create own coach profile"
  on public.coach_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

-- Coach can update own profile (except status)
create policy "Coach can update own profile"
  on public.coach_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status = (select status from public.coach_profiles where user_id = auth.uid())
  );

-- Admins can manage all coach profiles
create policy "Admins can manage all coach profiles"
  on public.coach_profiles for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_coach_profiles_user on public.coach_profiles(user_id);
create index idx_coach_profiles_status on public.coach_profiles(status);

-- ============================================
-- COACH CLIENTS (coach-client relationships)
-- ============================================
create table public.coach_clients (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  client_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired')),
  initiated_by text not null check (initiated_by in ('coach', 'client')),
  started_at date,
  expires_at date,
  price decimal,
  notes text,
  created_at timestamptz not null default now(),
  unique(coach_id, client_id)
);

alter table public.coach_clients enable row level security;

-- Coach can read their own client relationships
create policy "Coach can read own clients"
  on public.coach_clients for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id and cp.user_id = auth.uid()
    )
  );

-- Client can read their own coaching relationships
create policy "Client can read own coaching relationships"
  on public.coach_clients for select
  to authenticated
  using (client_id = auth.uid());

-- Coach can invite clients (initiated_by = 'coach')
create policy "Coach can invite clients"
  on public.coach_clients for insert
  to authenticated
  with check (
    initiated_by = 'coach'
    and exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id
      and cp.user_id = auth.uid()
      and cp.status = 'approved'
      and (select count(*) from public.coach_clients cc where cc.coach_id = cp.id and cc.status = 'active') < cp.max_clients
    )
  );

-- Client can request a coach (initiated_by = 'client')
create policy "Client can request a coach"
  on public.coach_clients for insert
  to authenticated
  with check (
    initiated_by = 'client'
    and client_id = auth.uid()
    and exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id
      and cp.status = 'approved'
      and (select count(*) from public.coach_clients cc where cc.coach_id = cp.id and cc.status = 'active') < cp.max_clients
    )
  );

-- Coach can update notes, expires_at, price, and accept client requests
create policy "Coach can update client relationships"
  on public.coach_clients for update
  to authenticated
  using (
    exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id and cp.user_id = auth.uid()
    )
  );

-- Client can accept coach invites or expire relationship
create policy "Client can update own coaching status"
  on public.coach_clients for update
  to authenticated
  using (client_id = auth.uid());

-- Admins can manage all
create policy "Admins can manage all coach clients"
  on public.coach_clients for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_coach_clients_coach on public.coach_clients(coach_id);
create index idx_coach_clients_client on public.coach_clients(client_id);

-- ============================================
-- MACRO TARGETS (coach-set nutrition targets)
-- ============================================
create table public.macro_targets (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references public.coach_clients(id) on delete cascade,
  protein decimal not null,
  carbs decimal not null,
  fat decimal not null,
  effective_date date not null,
  created_at timestamptz not null default now()
);

alter table public.macro_targets enable row level security;

-- Coach can manage macro targets for own clients
create policy "Coach can manage macro targets for own clients"
  on public.macro_targets for all
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.id = coach_client_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Client can read own macro targets
create policy "Client can read own macro targets"
  on public.macro_targets for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.id = coach_client_id
      and cc.client_id = auth.uid()
    )
  );

-- Admins can manage all
create policy "Admins can manage all macro targets"
  on public.macro_targets for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_macro_targets_client_date on public.macro_targets(coach_client_id, effective_date desc);

-- ============================================
-- COACH PROGRAM ASSIGNMENTS
-- ============================================
create table public.coach_program_assignments (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references public.coach_clients(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  duration_weeks integer,
  started_at date not null,
  ended_at date,
  status text not null default 'active' check (status in ('active', 'completed', 'swapped')),
  created_at timestamptz not null default now()
);

alter table public.coach_program_assignments enable row level security;

-- Coach can manage assignments for own clients
create policy "Coach can manage program assignments for own clients"
  on public.coach_program_assignments for all
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.id = coach_client_id
      and cp.user_id = auth.uid()
    )
  );

-- Client can read own program assignments
create policy "Client can read own program assignments"
  on public.coach_program_assignments for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.id = coach_client_id
      and cc.client_id = auth.uid()
    )
  );

-- Admins can manage all
create policy "Admins can manage all program assignments"
  on public.coach_program_assignments for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_coach_program_assignments_client on public.coach_program_assignments(coach_client_id);

-- ============================================
-- COACH SUBSCRIPTIONS (admin-managed revenue tracking)
-- ============================================
create table public.coach_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  base_fee decimal not null,
  per_client_fee decimal not null default 0,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  current_period_start date not null,
  current_period_end date not null,
  created_at timestamptz not null default now()
);

alter table public.coach_subscriptions enable row level security;

-- Coach can read own subscription
create policy "Coach can read own subscription"
  on public.coach_subscriptions for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id and cp.user_id = auth.uid()
    )
  );

-- Admins can manage all subscriptions
create policy "Admins can manage all subscriptions"
  on public.coach_subscriptions for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- ============================================
-- USER AGREEMENTS (ToS and waiver tracking)
-- ============================================
create table public.user_agreements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  document_type text not null check (document_type in ('tos', 'coaching_waiver')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  unique(user_id, document_type, document_version)
);

alter table public.user_agreements enable row level security;

-- Users can read own agreements
create policy "Users can read own agreements"
  on public.user_agreements for select
  to authenticated
  using (user_id = auth.uid());

-- Users can accept agreements
create policy "Users can accept agreements"
  on public.user_agreements for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admins can read all agreements
create policy "Admins can read all agreements"
  on public.user_agreements for select
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_user_agreements_user on public.user_agreements(user_id);

-- ============================================
-- COACH ACCESS TO EXISTING CLIENT DATA
-- Add SELECT policies so coaches can read their active clients' data
-- ============================================

-- Coach can read client body weight logs
create policy "Coach can read client body weight logs"
  on public.body_weight_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.client_id = user_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client workout sessions
create policy "Coach can read client workout sessions"
  on public.workout_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.client_id = user_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client session sets
create policy "Coach can read client session sets"
  on public.session_sets for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      join public.coach_clients cc on cc.client_id = ws.user_id
      join public.coach_profiles cp on cp.id = cc.coach_id
      where ws.id = session_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client phases
create policy "Coach can read client phases"
  on public.phases for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.client_id = user_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client phase schedules
create policy "Coach can read client phase schedules"
  on public.phase_schedule for select
  to authenticated
  using (
    exists (
      select 1 from public.phases ph
      join public.coach_clients cc on cc.client_id = ph.user_id
      join public.coach_profiles cp on cp.id = cc.coach_id
      where ph.id = phase_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client user profiles (name, avatar for dashboard)
create policy "Coach can read client profiles"
  on public.users for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.client_id = id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Client can read their coach's programs (for assigned programs)
create policy "Client can read coach assigned programs"
  on public.programs for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_program_assignments cpa
      join public.coach_clients cc on cc.id = cpa.coach_client_id
      where cpa.program_id = id
      and cc.client_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Verify SQL syntax**

Read through the file and verify:
- All table names match spec: `coach_profiles`, `coach_clients`, `macro_targets`, `coach_program_assignments`, `coach_subscriptions`, `user_agreements`
- All FK references are correct
- All CHECK constraints use valid syntax
- All RLS policies cover the correct operations

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00006_coaching_platform.sql
git commit -m "Add coaching platform database migration

- Create coach_profiles, coach_clients, macro_targets tables
- Create coach_program_assignments, coach_subscriptions tables
- Create user_agreements table for ToS tracking
- Add RLS policies for coach-client data access
- Add coach SELECT policies on existing tables (logs, sessions, phases)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: TypeScript Types — Coaching Interfaces

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add coaching types**

Append the following interfaces to `src/types/index.ts`:

```typescript
export interface CoachProfile {
  id: string;
  user_id: string;
  bio: string;
  experience: string;
  photo_url: string | null;
  status: "pending" | "approved" | "suspended";
  max_clients: number;
  monthly_rate: number | null;
  created_at: string;
  user?: UserProfile;
}

export interface CoachClient {
  id: string;
  coach_id: string;
  client_id: string;
  status: "pending" | "active" | "expired";
  initiated_by: "coach" | "client";
  started_at: string | null;
  expires_at: string | null;
  price: number | null;
  notes: string | null;
  created_at: string;
  client?: UserProfile;
  coach_profile?: CoachProfile;
}

export interface MacroTarget {
  id: string;
  coach_client_id: string;
  protein: number;
  carbs: number;
  fat: number;
  effective_date: string;
  created_at: string;
}

export interface CoachProgramAssignment {
  id: string;
  coach_client_id: string;
  program_id: string;
  duration_weeks: number | null;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "swapped";
  created_at: string;
  program?: Program;
}

export interface CoachSubscription {
  id: string;
  coach_id: string;
  base_fee: number;
  per_client_fee: number;
  status: "active" | "expired" | "cancelled";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

export interface UserAgreement {
  id: string;
  user_id: string;
  document_type: "tos" | "coaching_waiver";
  document_version: string;
  accepted_at: string;
  ip_address: string | null;
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "Add TypeScript interfaces for coaching platform

- CoachProfile, CoachClient, MacroTarget types
- CoachProgramAssignment, CoachSubscription, UserAgreement types

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Terms of Service — Acceptance Component & Content

**Files:**
- Create: `src/components/legal/TermsOfService.tsx`
- Create: `src/components/legal/CoachingWaiver.tsx`
- Create: `src/components/legal/AgreementModal.tsx`

- [ ] **Step 1: Create the ToS content component**

Create `src/components/legal/TermsOfService.tsx`:

```tsx
export const TOS_VERSION = "1.0";

export default function TermsOfService() {
  return (
    <div className="prose prose-invert prose-sm max-w-none space-y-4 text-foreground/80">
      <h2 className="text-lg font-bold text-foreground">Terms of Service</h2>
      <p className="text-xs text-subtext">Version {TOS_VERSION} — Effective April 2026</p>

      <h3 className="text-sm font-semibold text-foreground">1. Nature of Service</h3>
      <p>RepFlow is a fitness tracking tool designed for logging workouts, nutrition, and progress. RepFlow is not a medical, dietary, or professional health service.</p>

      <h3 className="text-sm font-semibold text-foreground">2. No Medical Advice</h3>
      <p>Content on this platform, including recommendations made by coaches, does not constitute medical, nutritional, or professional health advice. Always consult a qualified healthcare professional before beginning any exercise or nutrition program.</p>

      <h3 className="text-sm font-semibold text-foreground">3. Assumption of Risk</h3>
      <p>You acknowledge that physical exercise and dietary changes carry inherent risks including but not limited to physical injury, illness, or death. You assume full responsibility for your health decisions and any consequences thereof.</p>

      <h3 className="text-sm font-semibold text-foreground">4. Limitation of Liability</h3>
      <p>To the maximum extent permitted by applicable law, RepFlow, its operators, affiliates, coaches, and contributors shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to damages for personal injury, loss of profits, data, or goodwill, arising from or related to your use of the service.</p>

      <h3 className="text-sm font-semibold text-foreground">5. Indemnification</h3>
      <p>You agree to indemnify, defend, and hold harmless RepFlow and its operators from any claims, damages, losses, liabilities, costs, or expenses (including reasonable legal fees) arising from your use of the service, violation of these terms, or infringement of any third-party rights.</p>

      <h3 className="text-sm font-semibold text-foreground">6. User Conduct</h3>
      <p>You agree not to misuse the platform, provide harmful advice, impersonate qualified professionals, or engage in any activity that violates applicable laws or regulations.</p>

      <h3 className="text-sm font-semibold text-foreground">7. Data Privacy</h3>
      <p>By using RepFlow, you consent to the collection, processing, and storage of your fitness data as required to provide the service. When connecting with a coach, you acknowledge that the coach will have access to your workout logs, body weight, nutrition data, and progress metrics.</p>

      <h3 className="text-sm font-semibold text-foreground">8. Account Termination</h3>
      <p>RepFlow reserves the right to suspend or terminate any account at its sole discretion, with or without notice, for any reason including violation of these terms.</p>

      <h3 className="text-sm font-semibold text-foreground">9. Age Requirement</h3>
      <p>You must be at least 18 years of age to use RepFlow. By using the service, you represent that you meet this requirement.</p>

      <h3 className="text-sm font-semibold text-foreground">10. Modifications</h3>
      <p>RepFlow may update these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms. You will be notified of material changes and asked to re-accept.</p>

      <h3 className="text-sm font-semibold text-foreground">11. Governing Law</h3>
      <p>These terms are governed by the laws of India. Any disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules, with the seat of arbitration in India.</p>

      <h3 className="text-sm font-semibold text-foreground">12. Severability</h3>
      <p>If any provision of these terms is found unenforceable, the remaining provisions shall remain in full force and effect.</p>

      <h3 className="text-sm font-semibold text-foreground">13. Entire Agreement</h3>
      <p>These Terms of Service constitute the entire agreement between you and RepFlow regarding the use of the service and supersede all prior agreements.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the coaching waiver content component**

Create `src/components/legal/CoachingWaiver.tsx`:

```tsx
export const COACHING_WAIVER_VERSION = "1.0";

export default function CoachingWaiver() {
  return (
    <div className="prose prose-invert prose-sm max-w-none space-y-4 text-foreground/80">
      <h2 className="text-lg font-bold text-foreground">Coaching Services Waiver</h2>
      <p className="text-xs text-subtext">Version {COACHING_WAIVER_VERSION} — Effective April 2026</p>

      <h3 className="text-sm font-semibold text-foreground">1. Independent Relationship</h3>
      <p>Coaches on RepFlow are independent service providers. They are not employees, agents, or representatives of RepFlow. RepFlow does not control, direct, or supervise coaching services.</p>

      <h3 className="text-sm font-semibold text-foreground">2. Not Professional Advice</h3>
      <p>Coaching provided through RepFlow is general fitness guidance only. It does not constitute licensed medical, nutritional, physiotherapy, or any other form of professional healthcare advice.</p>

      <h3 className="text-sm font-semibold text-foreground">3. Coach Qualifications</h3>
      <p>RepFlow does not verify, certify, endorse, or guarantee the qualifications, credentials, or competence of any coach. You should independently verify your coach&apos;s credentials and suitability before following their recommendations.</p>

      <h3 className="text-sm font-semibold text-foreground">4. Assumption of Risk</h3>
      <p>You acknowledge and accept that following any coach&apos;s program, nutrition targets, or recommendations is done entirely at your own risk. You are solely responsible for determining whether any exercise or dietary recommendation is appropriate for your individual health condition.</p>

      <h3 className="text-sm font-semibold text-foreground">5. No Guarantee of Results</h3>
      <p>Neither RepFlow nor any coach guarantees any specific fitness, health, body composition, or aesthetic outcomes. Results vary based on individual factors beyond the control of the platform or coach.</p>

      <h3 className="text-sm font-semibold text-foreground">6. Liability Waiver</h3>
      <p>To the maximum extent permitted by law, you waive all claims, demands, and causes of action against RepFlow, its operators, and affiliates arising from or related to the coaching relationship. Any disputes regarding coaching services are solely between you and your coach.</p>

      <h3 className="text-sm font-semibold text-foreground">7. Data Sharing Consent</h3>
      <p>By entering a coaching relationship, you explicitly consent to your coach viewing your workout logs, body weight data, nutrition logs (macros, calories, steps), progress metrics, and personal records for the duration of the coaching relationship.</p>

      <h3 className="text-sm font-semibold text-foreground">8. Termination</h3>
      <p>Either party may end the coaching relationship at any time through the app. Upon termination, the coach&apos;s access to your data will be revoked.</p>
    </div>
  );
}
```

- [ ] **Step 3: Create the agreement modal component**

Create `src/components/legal/AgreementModal.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import TermsOfService, { TOS_VERSION } from "./TermsOfService";
import CoachingWaiver, { COACHING_WAIVER_VERSION } from "./CoachingWaiver";

interface AgreementModalProps {
  type: "tos" | "coaching_waiver";
  onAccepted: () => void;
  onDeclined?: () => void;
}

export default function AgreementModal({ type, onAccepted, onDeclined }: AgreementModalProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const version = type === "tos" ? TOS_VERSION : COACHING_WAIVER_VERSION;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("user_agreements").insert({
      user_id: user.id,
      document_type: type,
      document_version: version,
    });

    setAccepting(false);
    onAccepted();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-lg max-h-[85vh] bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">
              {type === "tos" ? "Terms of Service" : "Coaching Services Waiver"}
            </h2>
            <p className="text-xs text-subtext mt-1">
              Please read and scroll to the bottom to accept
            </p>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4"
          >
            {type === "tos" ? <TermsOfService /> : <CoachingWaiver />}
          </div>

          <div className="p-4 border-t border-border flex gap-3">
            {onDeclined && (
              <Button variant="secondary" className="flex-1" onClick={onDeclined}>
                Decline
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={!scrolledToBottom || accepting}
            >
              {!scrolledToBottom
                ? "Scroll to accept"
                : accepting
                ? "Accepting..."
                : "I Accept"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/legal/
git commit -m "Add Terms of Service and Coaching Waiver components

- TermsOfService with 13 sections covering liability, indemnification, governing law
- CoachingWaiver with 8 sections for coach-client relationships
- AgreementModal with scroll-to-accept gate and Supabase persistence
- Versioned documents for re-acceptance on updates

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Coach Application Flow

**Files:**
- Create: `src/app/coaches/apply/page.tsx`
- Modify: `src/app/profile/page.tsx` (add "Become a Coach" button)

- [ ] **Step 1: Create the coach application page**

Create `src/app/coaches/apply/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import AgreementModal from "@/components/legal/AgreementModal";
import type { CoachProfile } from "@/types";
import { motion } from "framer-motion";

export default function CoachApplyPage() {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTos, setShowTos] = useState(false);
  const [existingProfile, setExistingProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("coach_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) setExistingProfile(data);
      setLoading(false);
    }
    load();
  }, [router]);

  const handleSubmit = async () => {
    if (!bio.trim() || !experience.trim()) return;
    setShowTos(true);
  };

  const handleTosAccepted = async () => {
    setShowTos(false);
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("coach_profiles").insert({
      user_id: user.id,
      bio: bio.trim(),
      experience: experience.trim(),
      monthly_rate: monthlyRate ? parseFloat(monthlyRate) : null,
    });

    setSaving(false);
    router.push("/profile");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (existingProfile) {
    return (
      <div className="min-h-screen bg-background px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-4">Coach Application</h1>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
              existingProfile.status === "approved"
                ? "bg-success/15 text-success"
                : existingProfile.status === "pending"
                ? "bg-warning/15 text-warning"
                : "bg-error/15 text-error"
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                existingProfile.status === "approved" ? "bg-success" :
                existingProfile.status === "pending" ? "bg-warning" : "bg-error"
              }`} />
              {existingProfile.status === "approved" ? "Approved" :
               existingProfile.status === "pending" ? "Under Review" : "Suspended"}
            </div>
            <p className="text-sm text-foreground/70">
              {existingProfile.status === "pending"
                ? "Your application is being reviewed. You'll get access to the coaching dashboard once approved."
                : existingProfile.status === "approved"
                ? "You're an approved coach! Access your dashboard from the home page."
                : "Your coaching account has been suspended. Contact support for more information."}
            </p>
          </div>
          <Button variant="secondary" className="w-full mt-4" onClick={() => router.push("/profile")}>
            Back to Profile
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Become a Coach</h1>
        <p className="text-sm text-subtext mb-6">Share your expertise and guide athletes on their fitness journey.</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell potential clients about yourself and your coaching style..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Experience & Qualifications</label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Your certifications, years of experience, specializations..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Monthly Rate (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtext">$</span>
              <input
                type="number"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50"
              />
            </div>
            <p className="text-xs text-subtext mt-1">Displayed on your public profile. You collect payment externally.</p>
          </div>
        </div>

        <Button
          className="w-full mt-6"
          onClick={handleSubmit}
          disabled={!bio.trim() || !experience.trim() || saving}
        >
          {saving ? "Submitting..." : "Submit Application"}
        </Button>
      </motion.div>

      {showTos && (
        <AgreementModal
          type="tos"
          onAccepted={handleTosAccepted}
          onDeclined={() => setShowTos(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add "Become a Coach" / "Find a Coach" buttons to profile page**

In `src/app/profile/page.tsx`, add state for coach profile:

```tsx
const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
const [coachRelationship, setCoachRelationship] = useState<CoachClient | null>(null);
```

Add the import at top:
```tsx
import type { CoachProfile, CoachClient } from "@/types";
```

Inside the existing `useEffect` `load()` function, after loading the user profile, add:

```tsx
// Check if user is a coach
const { data: coachData } = await supabase
  .from("coach_profiles")
  .select("*")
  .eq("user_id", user.id)
  .single();
if (coachData) setCoachProfile(coachData);

// Check if user has a coach
const { data: coaching } = await supabase
  .from("coach_clients")
  .select("*, coach_profile:coach_profiles(*, user:users(display_name, avatar_url))")
  .eq("client_id", user.id)
  .eq("status", "active")
  .limit(1)
  .single();
if (coaching) setCoachRelationship(coaching);
```

Add a coaching section in the profile page JSX (before the sign out button):

```tsx
{/* Coaching Section */}
<div className="bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-2xl p-4">
  <h3 className="text-sm font-semibold text-foreground mb-3">Coaching</h3>
  <div className="space-y-2">
    {coachProfile?.status === "approved" && (
      <Link href="/coach/dashboard" className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
        <span className="text-sm font-medium text-primary">Coach Dashboard</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-primary">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    )}
    {!coachProfile && (
      <Link href="/coaches/apply" className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
        <span className="text-sm text-foreground">Become a Coach</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-subtext">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    )}
    {coachProfile?.status === "pending" && (
      <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl">
        <span className="text-sm text-warning">Coach application under review</span>
      </div>
    )}
    <Link href="/coaches" className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
      <span className="text-sm text-foreground">Find a Coach</span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-subtext">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  </div>
</div>
```

Add the `Link` import if not already present:
```tsx
import Link from "next/link";
```

- [ ] **Step 3: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/coaches/apply/page.tsx src/app/profile/page.tsx
git commit -m "Add coach application flow and profile coaching section

- Coach application page with bio, experience, rate form
- ToS acceptance gate before submission
- Status display for pending/approved/suspended coaches
- Profile page shows coaching section with dashboard link, apply, find coach

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Browse Coaches Page

**Files:**
- Create: `src/app/coaches/page.tsx`
- Create: `src/app/coaches/[id]/page.tsx`

- [ ] **Step 1: Create the coaches browse page**

Create `src/app/coaches/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CoachProfile } from "@/types";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("coach_profiles")
        .select("*, user:users(display_name, avatar_url)")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setCoaches(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-2">Find a Coach</h1>
      <p className="text-sm text-subtext mb-6">Browse coaches and get personalized guidance.</p>

      {coaches.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-subtext">No coaches available yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {coaches.map((coach, i) => (
            <motion.div
              key={coach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/coaches/${coach.id}`} className="block">
                <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {coach.photo_url || coach.user?.avatar_url ? (
                        <img
                          src={coach.photo_url || coach.user?.avatar_url || ""}
                          alt={coach.user?.display_name || "Coach"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg text-primary">
                          {coach.user?.display_name?.[0]?.toUpperCase() || "C"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {coach.user?.display_name || "Coach"}
                        </h3>
                        {coach.monthly_rate && (
                          <span className="text-xs font-medium text-accent">${coach.monthly_rate}/mo</span>
                        )}
                      </div>
                      <p className="text-xs text-subtext mt-1 line-clamp-2">{coach.bio}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the individual coach profile page**

Create `src/app/coaches/[id]/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CoachProfile } from "@/types";
import Button from "@/components/ui/Button";
import AgreementModal from "@/components/legal/AgreementModal";
import { motion } from "framer-motion";

export default function CoachProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [existingRelationship, setExistingRelationship] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: coachData } = await supabase
        .from("coach_profiles")
        .select("*, user:users(display_name, avatar_url, email)")
        .eq("id", params.id)
        .single();

      if (!coachData) { router.push("/coaches"); return; }
      setCoach(coachData);

      // Check if already connected
      const { data: rel } = await supabase
        .from("coach_clients")
        .select("status")
        .eq("coach_id", params.id)
        .eq("client_id", user.id)
        .single();

      if (rel) setExistingRelationship(rel.status);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  const handleRequestCoach = () => {
    setShowWaiver(true);
  };

  const handleWaiverAccepted = async () => {
    setShowWaiver(false);
    setRequesting(true);

    const supabase = createClient();
    await supabase.from("coach_clients").insert({
      coach_id: params.id,
      client_id: userId,
      initiated_by: "client",
    });

    setExistingRelationship("pending");
    setRequesting(false);
  };

  if (loading || !coach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnProfile = coach.user_id === userId;

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        {/* Coach Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center overflow-hidden flex-shrink-0">
            {coach.photo_url || coach.user?.avatar_url ? (
              <img
                src={coach.photo_url || coach.user?.avatar_url || ""}
                alt={coach.user?.display_name || "Coach"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-primary">
                {coach.user?.display_name?.[0]?.toUpperCase() || "C"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{coach.user?.display_name || "Coach"}</h1>
            {coach.monthly_rate && (
              <p className="text-sm font-medium text-accent">${coach.monthly_rate}/month</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">About</h2>
          <p className="text-sm text-foreground/70 whitespace-pre-wrap">{coach.bio}</p>
        </div>

        {/* Experience */}
        <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-2">Experience & Qualifications</h2>
          <p className="text-sm text-foreground/70 whitespace-pre-wrap">{coach.experience}</p>
        </div>

        {/* Action Button */}
        {!isOwnProfile && (
          <>
            {existingRelationship === "active" && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-center">
                <span className="text-sm font-medium text-success">Currently your coach</span>
              </div>
            )}
            {existingRelationship === "pending" && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-center">
                <span className="text-sm font-medium text-warning">Request pending</span>
              </div>
            )}
            {!existingRelationship && (
              <Button className="w-full" onClick={handleRequestCoach} disabled={requesting}>
                {requesting ? "Requesting..." : "Request Coaching"}
              </Button>
            )}
          </>
        )}

        <Button variant="secondary" className="w-full mt-3" onClick={() => router.push("/coaches")}>
          Back to Coaches
        </Button>
      </motion.div>

      {showWaiver && (
        <AgreementModal
          type="coaching_waiver"
          onAccepted={handleWaiverAccepted}
          onDeclined={() => setShowWaiver(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/coaches/
git commit -m "Add browse coaches and coach profile pages

- Coaches listing page with photo, name, bio, rate cards
- Individual coach profile page with full details
- Request coaching flow with waiver acceptance gate
- Status display for existing relationships (active/pending)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Coach Dashboard — Client List

**Files:**
- Create: `src/app/coach/dashboard/page.tsx`

- [ ] **Step 1: Create the coach dashboard page**

Create `src/app/coach/dashboard/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { CoachClient, CoachProfile, MacroTarget, CoachProgramAssignment } from "@/types";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";

interface ClientCardData extends CoachClient {
  todayLog: { protein: number | null; carbs: number | null; fat: number | null; steps: number | null } | null;
  todaySession: boolean;
  currentMacroTarget: MacroTarget | null;
  currentAssignment: (CoachProgramAssignment & { program?: { name: string } }) | null;
}

export default function CoachDashboardPage() {
  const router = useRouter();
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [clients, setClients] = useState<ClientCardData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CoachClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [addingClient, setAddingClient] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("coach_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.status !== "approved") {
        router.push("/profile");
        return;
      }
      setCoachProfile(profile);

      // Load all client relationships
      const { data: allClients } = await supabase
        .from("coach_clients")
        .select("*, client:users(id, display_name, avatar_url, email)")
        .eq("coach_id", profile.id)
        .order("created_at", { ascending: false });

      const active = (allClients || []).filter((c) => c.status === "active");
      const pending = (allClients || []).filter((c) => c.status === "pending");
      setPendingRequests(pending);

      const today = new Date().toISOString().split("T")[0];

      // Enrich active clients with today's data
      const enriched: ClientCardData[] = await Promise.all(
        active.map(async (client) => {
          // Today's log
          const { data: log } = await supabase
            .from("body_weight_logs")
            .select("protein, carbs, fat, steps")
            .eq("user_id", client.client_id)
            .eq("date", today)
            .single();

          // Today's workout session
          const { count } = await supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", client.client_id)
            .gte("started_at", `${today}T00:00:00`)
            .not("ended_at", "is", null);

          // Current macro target
          const { data: target } = await supabase
            .from("macro_targets")
            .select("*")
            .eq("coach_client_id", client.id)
            .lte("effective_date", today)
            .order("effective_date", { ascending: false })
            .limit(1)
            .single();

          // Current program assignment
          const { data: assignment } = await supabase
            .from("coach_program_assignments")
            .select("*, program:programs(name)")
            .eq("coach_client_id", client.id)
            .eq("status", "active")
            .limit(1)
            .single();

          return {
            ...client,
            todayLog: log || null,
            todaySession: (count || 0) > 0,
            currentMacroTarget: target || null,
            currentAssignment: assignment || null,
          };
        })
      );

      setClients(enriched);
      setLoading(false);
    }
    load();
  }, [router]);

  const handleAcceptClient = async (clientRelId: string) => {
    const supabase = createClient();
    await supabase
      .from("coach_clients")
      .update({ status: "active", started_at: new Date().toISOString().split("T")[0] })
      .eq("id", clientRelId);
    window.location.reload();
  };

  const handleDeclineClient = async (clientRelId: string) => {
    const supabase = createClient();
    await supabase
      .from("coach_clients")
      .update({ status: "expired" })
      .eq("id", clientRelId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== clientRelId));
  };

  const handleAddClient = async () => {
    if (!searchEmail.trim() || !coachProfile) return;
    setAddingClient(true);

    const supabase = createClient();
    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", searchEmail.trim())
      .single();

    if (!targetUser) {
      alert("User not found with that email.");
      setAddingClient(false);
      return;
    }

    await supabase.from("coach_clients").insert({
      coach_id: coachProfile.id,
      client_id: targetUser.id,
      initiated_by: "coach",
    });

    setAddingClient(false);
    setShowAddClient(false);
    setSearchEmail("");
    window.location.reload();
  };

  const getCalories = (log: ClientCardData["todayLog"], target: MacroTarget | null) => {
    if (!log || (log.protein == null && log.carbs == null && log.fat == null)) return null;
    const actual = ((log.protein || 0) * 4) + ((log.carbs || 0) * 4) + ((log.fat || 0) * 9);
    const targetCal = target ? (target.protein * 4 + target.carbs * 4 + target.fat * 9) : null;
    return { actual, target: targetCal };
  };

  const getCalorieColor = (actual: number, target: number | null) => {
    if (!target) return "text-foreground";
    const diff = actual - target;
    if (diff <= 0) return "text-success";
    if (diff <= 300) return "text-warning";
    return "text-error";
  };

  const getBarColor = (actual: number, target: number | null) => {
    if (!target) return "bg-primary";
    const diff = actual - target;
    if (diff <= 0) return "bg-success";
    if (diff <= 300) return "bg-warning";
    return "bg-error";
  };

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
          <p className="text-sm text-subtext">{clients.length} active · {pendingRequests.length} pending</p>
        </div>
        <Button size="sm" onClick={() => setShowAddClient(!showAddClient)}>
          + Add Client
        </Button>
      </div>

      {/* Add Client Form */}
      {showAddClient && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mb-4 bg-card border border-border rounded-2xl p-4">
          <p className="text-sm text-foreground mb-2">Invite by email</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="client@email.com"
              className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-foreground placeholder:text-subtext/50"
            />
            <Button size="sm" onClick={handleAddClient} disabled={addingClient}>
              {addingClient ? "..." : "Invite"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Pending Requests</h2>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-warning/5 border border-warning/20 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center">
                    <span className="text-xs text-warning font-medium">
                      {req.client?.display_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{req.client?.display_name}</p>
                    <p className="text-xs text-subtext">{req.initiated_by === "client" ? "Requested you" : "Invite sent"}</p>
                  </div>
                </div>
                {req.initiated_by === "client" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleDeclineClient(req.id)} className="px-3 py-1.5 text-xs rounded-lg bg-surface border border-border text-subtext">
                      Decline
                    </button>
                    <button onClick={() => handleAcceptClient(req.id)} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-background font-medium">
                      Accept
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Clients */}
      <div className="space-y-3">
        {clients.map((client, i) => {
          const cals = getCalories(client.todayLog, client.currentMacroTarget);
          const daysLeft = getDaysUntilExpiry(client.expires_at);

          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/coach/clients/${client.id}`}>
                <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${
                        daysLeft !== null && daysLeft <= 0 ? "bg-error" :
                        daysLeft !== null && daysLeft <= 7 ? "bg-warning" : "bg-success"
                      }`} />
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                        {client.client?.avatar_url ? (
                          <img src={client.client.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-primary font-medium">
                            {client.client?.display_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{client.client?.display_name}</span>
                    </div>
                    {daysLeft !== null && (
                      <span className={`text-xs font-medium ${daysLeft <= 0 ? "text-error" : daysLeft <= 7 ? "text-warning" : "text-subtext"}`}>
                        {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
                      </span>
                    )}
                  </div>

                  {/* Program Progress */}
                  {client.currentAssignment && (
                    <p className="text-xs text-subtext mb-2">
                      {client.currentAssignment.program?.name}
                      {client.currentAssignment.duration_weeks && (
                        <> — Week {Math.min(
                          Math.ceil((Date.now() - new Date(client.currentAssignment.started_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
                          client.currentAssignment.duration_weeks
                        )} of {client.currentAssignment.duration_weeks}</>
                      )}
                    </p>
                  )}

                  {/* Macro Bar */}
                  {cals && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={getCalorieColor(cals.actual, cals.target)}>
                          {Math.round(cals.actual)} {cals.target ? `/ ${Math.round(cals.target)}` : ""} kcal
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface rounded-full">
                        <div
                          className={`h-full rounded-full transition-all ${getBarColor(cals.actual, cals.target)}`}
                          style={{ width: `${Math.min((cals.actual / (cals.target || cals.actual)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Activity Indicators */}
                  <div className="flex gap-3 text-xs">
                    <span className={client.todayLog ? "text-success" : "text-subtext/40"}>
                      {client.todayLog ? "✓" : "○"} Logged today
                    </span>
                    <span className={client.todaySession ? "text-success" : "text-subtext/40"}>
                      {client.todaySession ? "✓" : "○"} Worked out
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {clients.length === 0 && (
          <div className="text-center py-16">
            <p className="text-subtext">No active clients yet.</p>
            <p className="text-xs text-subtext/60 mt-1">Add clients using the button above or wait for requests.</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/coach/dashboard/page.tsx
git commit -m "Add coach dashboard with at-a-glance client cards

- Client cards show program progress, macro compliance, activity status
- Tiered calorie color feedback (green/amber/red)
- Subscription expiry indicators (green/amber/red dots)
- Pending request management (accept/decline)
- Add client by email invite flow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Coach Client Detail View

**Files:**
- Create: `src/app/coach/clients/[id]/page.tsx`

- [ ] **Step 1: Create the client detail page with tabs**

Create `src/app/coach/clients/[id]/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CoachClient, MacroTarget, CoachProgramAssignment, BodyWeightLog, WorkoutSession, Program } from "@/types";
import Button from "@/components/ui/Button";
import WeightChart from "@/components/charts/WeightChart";
import { motion } from "framer-motion";
import { useWeightUnit } from "@/context/WeightUnitContext";

type Tab = "overview" | "macros" | "program" | "activity" | "settings";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { unitLabel } = useWeightUnit();
  const [tab, setTab] = useState<Tab>("overview");
  const [client, setClient] = useState<CoachClient | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [weightLogs, setWeightLogs] = useState<BodyWeightLog[]>([]);
  const [macroTarget, setMacroTarget] = useState<MacroTarget | null>(null);
  const [macroHistory, setMacroHistory] = useState<MacroTarget[]>([]);
  const [assignment, setAssignment] = useState<(CoachProgramAssignment & { program?: Program }) | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [coachPrograms, setCoachPrograms] = useState<Program[]>([]);

  // Edit states
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");
  const [savingMacros, setSavingMacros] = useState(false);
  const [editExpiry, setEditExpiry] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Program assignment
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [assigningProgram, setAssigningProgram] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load client relationship
    const { data: clientData } = await supabase
      .from("coach_clients")
      .select("*, client:users(id, display_name, avatar_url, email)")
      .eq("id", params.id)
      .single();

    if (!clientData) { router.push("/coach/dashboard"); return; }
    setClient(clientData);
    setEditExpiry(clientData.expires_at || "");
    setEditPrice(clientData.price?.toString() || "");
    setEditNotes(clientData.notes || "");

    const clientId = clientData.client_id;
    const today = new Date().toISOString().split("T")[0];

    // Weight logs (last 30 days)
    const { data: logs } = await supabase
      .from("body_weight_logs")
      .select("*")
      .eq("user_id", clientId)
      .order("date", { ascending: false })
      .limit(30);
    setWeightLogs((logs || []).reverse());

    // Current macro target
    const { data: target } = await supabase
      .from("macro_targets")
      .select("*")
      .eq("coach_client_id", clientData.id)
      .lte("effective_date", today)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();
    if (target) {
      setMacroTarget(target);
      setEditProtein(target.protein.toString());
      setEditCarbs(target.carbs.toString());
      setEditFat(target.fat.toString());
    }

    // Macro target history
    const { data: history } = await supabase
      .from("macro_targets")
      .select("*")
      .eq("coach_client_id", clientData.id)
      .order("effective_date", { ascending: false });
    setMacroHistory(history || []);

    // Current program assignment
    const { data: prog } = await supabase
      .from("coach_program_assignments")
      .select("*, program:programs(id, name, description)")
      .eq("coach_client_id", clientData.id)
      .eq("status", "active")
      .limit(1)
      .single();
    setAssignment(prog);

    // Recent sessions
    const { data: sess } = await supabase
      .from("workout_sessions")
      .select("*, program_workout:program_workouts(name)")
      .eq("user_id", clientId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(20);
    setSessions(sess || []);

    // Coach's own programs (for assignment)
    const { data: myPrograms } = await supabase
      .from("programs")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");
    setCoachPrograms(myPrograms || []);

    setLoading(false);
  }, [params.id, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveMacros = async () => {
    if (!client || !editProtein || !editCarbs || !editFat) return;
    setSavingMacros(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    await supabase.from("macro_targets").insert({
      coach_client_id: client.id,
      protein: parseFloat(editProtein),
      carbs: parseFloat(editCarbs),
      fat: parseFloat(editFat),
      effective_date: today,
    });

    setSavingMacros(false);
    loadData();
  };

  const handleAssignProgram = async () => {
    if (!client || !selectedProgramId) return;
    setAssigningProgram(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // End current assignment if exists
    if (assignment) {
      await supabase
        .from("coach_program_assignments")
        .update({ status: "swapped", ended_at: today })
        .eq("id", assignment.id);
    }

    await supabase.from("coach_program_assignments").insert({
      coach_client_id: client.id,
      program_id: selectedProgramId,
      duration_weeks: durationWeeks ? parseInt(durationWeeks) : null,
      started_at: today,
    });

    setAssigningProgram(false);
    setSelectedProgramId("");
    setDurationWeeks("");
    loadData();
  };

  const handleSaveSettings = async () => {
    if (!client) return;
    setSavingSettings(true);
    const supabase = createClient();

    await supabase
      .from("coach_clients")
      .update({
        expires_at: editExpiry || null,
        price: editPrice ? parseFloat(editPrice) : null,
        notes: editNotes || null,
      })
      .eq("id", client.id);

    setSavingSettings(false);
    loadData();
  };

  const handleDisconnect = async () => {
    if (!client || !confirm("Disconnect this client? This will end the coaching relationship.")) return;
    const supabase = createClient();
    await supabase.from("coach_clients").update({ status: "expired" }).eq("id", client.id);
    router.push("/coach/dashboard");
  };

  const formatDurationShort = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  if (loading || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "macros", label: "Macros" },
    { key: "program", label: "Program" },
    { key: "activity", label: "Activity" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <button onClick={() => router.push("/coach/dashboard")} className="text-xs text-subtext mb-3 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
            {client.client?.avatar_url ? (
              <img src={client.client.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg text-primary">{client.client?.display_name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{client.client?.display_name}</h1>
            <p className="text-xs text-subtext">{client.client?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-primary/15 text-primary" : "text-subtext hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {/* Overview Tab */}
        {tab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {weightLogs.length > 0 && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Weight Trend</h3>
                <WeightChart data={weightLogs} />
              </div>
            )}
            {assignment && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">Current Program</h3>
                <p className="text-foreground/70 text-sm">{assignment.program?.name}</p>
                {assignment.duration_weeks && (
                  <p className="text-xs text-subtext mt-1">
                    Week {Math.min(
                      Math.ceil((Date.now() - new Date(assignment.started_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
                      assignment.duration_weeks
                    )} of {assignment.duration_weeks}
                  </p>
                )}
              </div>
            )}
            {macroTarget && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Macro Targets</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{macroTarget.protein}g</p>
                    <p className="text-xs text-subtext">Protein</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-accent">{macroTarget.carbs}g</p>
                    <p className="text-xs text-subtext">Carbs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-warning">{macroTarget.fat}g</p>
                    <p className="text-xs text-subtext">Fat</p>
                  </div>
                </div>
                <p className="text-xs text-subtext text-center mt-2">
                  {Math.round(macroTarget.protein * 4 + macroTarget.carbs * 4 + macroTarget.fat * 9)} kcal/day
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Macros Tab */}
        {tab === "macros" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Set Macro Targets</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-subtext block mb-1">Protein (g)</label>
                  <input type="number" value={editProtein} onChange={(e) => setEditProtein(e.target.value)}
                    className="w-full px-2 py-2 text-center text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-subtext block mb-1">Carbs (g)</label>
                  <input type="number" value={editCarbs} onChange={(e) => setEditCarbs(e.target.value)}
                    className="w-full px-2 py-2 text-center text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-subtext block mb-1">Fat (g)</label>
                  <input type="number" value={editFat} onChange={(e) => setEditFat(e.target.value)}
                    className="w-full px-2 py-2 text-center text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
              </div>
              {editProtein && editCarbs && editFat && (
                <p className="text-xs text-subtext text-center mb-3">
                  = {Math.round(parseFloat(editProtein || "0") * 4 + parseFloat(editCarbs || "0") * 4 + parseFloat(editFat || "0") * 9)} kcal/day
                </p>
              )}
              <Button size="sm" className="w-full" onClick={handleSaveMacros} disabled={savingMacros}>
                {savingMacros ? "Saving..." : "Save Targets"}
              </Button>
            </div>

            {/* Recent Logs vs Targets */}
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent Daily Logs</h3>
              <div className="space-y-2">
                {weightLogs.filter((l) => l.protein != null || l.carbs != null || l.fat != null).slice(-14).reverse().map((log) => {
                  const actual = ((log.protein || 0) * 4) + ((log.carbs || 0) * 4) + ((log.fat || 0) * 9);
                  const targetCal = macroTarget ? (macroTarget.protein * 4 + macroTarget.carbs * 4 + macroTarget.fat * 9) : null;
                  const diff = targetCal ? actual - targetCal : null;
                  return (
                    <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-subtext">{new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span className="text-foreground/70">{log.protein || 0}P / {log.carbs || 0}C / {log.fat || 0}F</span>
                      <span className={
                        diff === null ? "text-foreground" :
                        diff <= 0 ? "text-success" :
                        diff <= 300 ? "text-warning" : "text-error"
                      }>
                        {Math.round(actual)} kcal
                      </span>
                    </div>
                  );
                })}
                {weightLogs.filter((l) => l.protein != null).length === 0 && (
                  <p className="text-xs text-subtext/60 text-center py-4">No nutrition logs yet</p>
                )}
              </div>
            </div>

            {/* Target History */}
            {macroHistory.length > 1 && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Target History</h3>
                {macroHistory.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-subtext">{new Date(t.effective_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span className="text-foreground/70">{t.protein}P / {t.carbs}C / {t.fat}F</span>
                    <span className="text-subtext">{Math.round(t.protein * 4 + t.carbs * 4 + t.fat * 9)} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Program Tab */}
        {tab === "program" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {assignment && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Current Program</h3>
                <p className="text-foreground/70 text-sm">{assignment.program?.name}</p>
                <div className="flex gap-4 mt-2 text-xs text-subtext">
                  <span>Started: {new Date(assignment.started_at).toLocaleDateString()}</span>
                  {assignment.duration_weeks && <span>Duration: {assignment.duration_weeks} weeks</span>}
                  {!assignment.duration_weeks && <span>Open-ended</span>}
                </div>
              </div>
            )}

            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Assign Program</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-subtext block mb-1">Program</label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground"
                  >
                    <option value="">Select a program...</option>
                    {coachPrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-subtext block mb-1">Duration (weeks, leave empty for open-ended)</label>
                  <input
                    type="number"
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50"
                  />
                </div>
                <Button size="sm" className="w-full" onClick={handleAssignProgram} disabled={!selectedProgramId || assigningProgram}>
                  {assigningProgram ? "Assigning..." : assignment ? "Swap Program" : "Assign Program"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-2">
              {sessions.map((s) => {
                const duration = s.ended_at ? Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000) : 0;
                return (
                  <div key={s.id} className="bg-white/[0.05] border border-white/10 rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.program_workout?.name || "Workout"}</p>
                        <p className="text-xs text-subtext">
                          {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {formatDurationShort(duration)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-subtext text-sm">No workout sessions yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Subscription</h3>
              <div>
                <label className="text-xs text-subtext block mb-1">Expires at</label>
                <input type="date" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground" />
              </div>
              <div>
                <label className="text-xs text-subtext block mb-1">Price ($)</label>
                <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground" />
              </div>
              <div>
                <label className="text-xs text-subtext block mb-1">Private Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground resize-none" />
              </div>
              <Button size="sm" className="w-full" onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </div>

            <button
              onClick={handleDisconnect}
              className="w-full p-3 rounded-xl border border-error/30 text-error text-sm font-medium hover:bg-error/10 transition-colors"
            >
              Disconnect Client
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/coach/clients/
git commit -m "Add coach client detail view with tabs

- Overview: weight chart, current program, macro targets
- Macros: set/edit targets, daily compliance log, target history
- Program: current assignment, assign/swap programs with duration
- Activity: workout session history
- Settings: subscription dates, price, notes, disconnect

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Client Experience — Macro Target Display

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Load coach macro targets on profile page**

In the profile page's `load()` function, after loading the coach relationship (added in Task 6), add:

```tsx
// Load coach's macro targets for this user
if (coaching) {
  const { data: target } = await supabase
    .from("macro_targets")
    .select("*")
    .eq("coach_client_id", coaching.id)
    .lte("effective_date", new Date().toISOString().split("T")[0])
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();
  if (target) setMacroTarget(target);
}
```

Add state at the top:
```tsx
const [macroTarget, setMacroTarget] = useState<MacroTarget | null>(null);
```

Add import:
```tsx
import type { CoachProfile, CoachClient, MacroTarget } from "@/types";
```

- [ ] **Step 2: Add tiered calorie feedback in the daily log section**

After the existing calorie calculation display in the daily log card, add a comparison section:

```tsx
{macroTarget && (protein || carbs || fat) && (() => {
  const actualCal = ((protein || 0) * 4) + ((carbs || 0) * 4) + ((fat || 0) * 9);
  const targetCal = (macroTarget.protein * 4) + (macroTarget.carbs * 4) + (macroTarget.fat * 9);
  const diff = actualCal - targetCal;
  const color = diff <= 0 ? "text-success" : diff <= 300 ? "text-warning" : "text-error";
  const bgColor = diff <= 0 ? "bg-success/10 border-success/20" : diff <= 300 ? "bg-warning/10 border-warning/20" : "bg-error/10 border-error/20";
  return (
    <div className={`mt-3 p-3 rounded-xl border ${bgColor}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-subtext">Coach Target</span>
        <span className="text-xs font-medium text-foreground">{Math.round(targetCal)} kcal</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-subtext">Your Total</span>
        <span className={`text-xs font-medium ${color}`}>{Math.round(actualCal)} kcal</span>
      </div>
      {diff > 0 && (
        <p className={`text-xs mt-1 ${color}`}>
          {Math.round(diff)} kcal over target
        </p>
      )}
      {diff <= 0 && (
        <p className="text-xs mt-1 text-success">On target</p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <span className="text-subtext">P: </span>
          <span className={(protein || 0) > macroTarget.protein ? "text-warning" : "text-success"}>
            {protein || 0}/{macroTarget.protein}g
          </span>
        </div>
        <div className="text-center">
          <span className="text-subtext">C: </span>
          <span className={(carbs || 0) > macroTarget.carbs ? "text-warning" : "text-success"}>
            {carbs || 0}/{macroTarget.carbs}g
          </span>
        </div>
        <div className="text-center">
          <span className="text-subtext">F: </span>
          <span className={(fat || 0) > macroTarget.fat ? "text-warning" : "text-success"}>
            {fat || 0}/{macroTarget.fat}g
          </span>
        </div>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 3: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "Add coach macro target feedback on client profile

- Load active macro targets from coach_clients relationship
- Show tiered calorie comparison: green (on target), amber (<300 over), red (300+ over)
- Per-macro breakdown showing actual vs target for P/C/F

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Home Page — Coach Toggle

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add coach detection and toggle**

At the top of the `HomePage` component, add state:

```tsx
const [isCoach, setIsCoach] = useState(false);
const [showCoachView, setShowCoachView] = useState(false);
```

In the `load()` function, after loading the user, add:

```tsx
// Check if user is an approved coach
const { data: coachProfile } = await supabase
  .from("coach_profiles")
  .select("status")
  .eq("user_id", user.id)
  .single();
if (coachProfile?.status === "approved") setIsCoach(true);
```

- [ ] **Step 2: Add segmented control UI**

At the top of the page JSX (after the greeting), add a toggle for coaches:

```tsx
{isCoach && (
  <div className="flex bg-surface rounded-xl p-1 mb-4">
    <button
      onClick={() => setShowCoachView(false)}
      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
        !showCoachView ? "bg-primary/15 text-primary" : "text-subtext"
      }`}
    >
      My Workouts
    </button>
    <button
      onClick={() => setShowCoachView(true)}
      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
        showCoachView ? "bg-primary/15 text-primary" : "text-subtext"
      }`}
    >
      My Clients
    </button>
  </div>
)}
```

When `showCoachView` is true, render a link to the full dashboard:

```tsx
{showCoachView && (
  <div className="space-y-4">
    <Link href="/coach/dashboard" className="block">
      <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:border-primary/30 transition-colors">
        <h3 className="text-lg font-semibold text-foreground mb-2">Coach Dashboard</h3>
        <p className="text-sm text-subtext">View and manage your clients</p>
      </div>
    </Link>
  </div>
)}
```

Wrap the existing home page content in a conditional: `{!showCoachView && ( ... existing content ... )}`

Add `Link` import if not present:
```tsx
import Link from "next/link";
```

- [ ] **Step 3: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "Add coach toggle on home page

- Detect approved coach status on load
- Segmented control: My Workouts / My Clients
- My Clients view links to full coach dashboard

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Admin Panel — Coach Management

**Files:**
- Modify: `src/app/profile/admin/page.tsx`

- [ ] **Step 1: Add coach management section**

Add state for coach applications at the top:

```tsx
const [coachApplications, setCoachApplications] = useState<(CoachProfile & { user?: UserProfile })[]>([]);
```

Add import:
```tsx
import type { ExerciseSubmission, MuscleGroup, CoachProfile, UserProfile } from "@/types";
```

In the `load()` function, after loading exercise submissions, add:

```tsx
// Load coach applications
const { data: coaches } = await supabase
  .from("coach_profiles")
  .select("*, user:users(display_name, email, avatar_url)")
  .order("created_at", { ascending: false });
setCoachApplications(coaches || []);
```

- [ ] **Step 2: Add coach review functions**

Add handler functions:

```tsx
const handleCoachStatus = async (coachId: string, newStatus: "approved" | "suspended") => {
  const supabase = createClient();
  await supabase
    .from("coach_profiles")
    .update({ status: newStatus })
    .eq("id", coachId);
  setCoachApplications((prev) =>
    prev.map((c) => c.id === coachId ? { ...c, status: newStatus } : c)
  );
};
```

- [ ] **Step 3: Add coach management UI section**

After the exercise submissions section, add:

```tsx
{/* Coach Management */}
<div className="mt-8">
  <h2 className="text-lg font-semibold text-foreground mb-4">Coach Management</h2>
  {coachApplications.length === 0 ? (
    <p className="text-sm text-subtext">No coach applications.</p>
  ) : (
    <div className="space-y-3">
      {coachApplications.map((coach) => (
        <div key={coach.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                {coach.user?.avatar_url ? (
                  <img src={coach.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm text-primary">{coach.user?.display_name?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{coach.user?.display_name}</p>
                <p className="text-xs text-subtext">{coach.user?.email}</p>
              </div>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              coach.status === "approved" ? "bg-success/15 text-success" :
              coach.status === "pending" ? "bg-warning/15 text-warning" :
              "bg-error/15 text-error"
            }`}>
              {coach.status}
            </span>
          </div>
          <p className="text-xs text-foreground/70 mb-1"><strong>Bio:</strong> {coach.bio || "—"}</p>
          <p className="text-xs text-foreground/70 mb-3"><strong>Experience:</strong> {coach.experience || "—"}</p>
          <div className="flex gap-2">
            {coach.status !== "approved" && (
              <button
                onClick={() => handleCoachStatus(coach.id, "approved")}
                className="px-3 py-1.5 text-xs rounded-lg bg-success/15 text-success font-medium hover:bg-success/25 transition-colors"
              >
                Approve
              </button>
            )}
            {coach.status !== "suspended" && (
              <button
                onClick={() => handleCoachStatus(coach.id, "suspended")}
                className="px-3 py-1.5 text-xs rounded-lg bg-error/15 text-error font-medium hover:bg-error/25 transition-colors"
              >
                Suspend
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 4: Verify build passes**

Run: `npx next build --webpack 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/admin/page.tsx
git commit -m "Add coach management to admin panel

- List all coach applications with status badges
- Approve/Suspend toggle per coach
- Display bio, experience, and user details

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Final Build Verification & Push

**Files:** None (verification only)

- [ ] **Step 1: Run full production build**

Run: `npx next build --webpack 2>&1 | tail -20`
Expected: Build succeeds with all routes listed.

- [ ] **Step 2: Verify all new routes appear**

Expected routes in output:
```
○ /coaches
ƒ /coaches/[id]
○ /coaches/apply
○ /coach/dashboard
ƒ /coach/clients/[id]
```

- [ ] **Step 3: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

- [ ] **Step 4: Run migration on Supabase**

Go to Supabase Dashboard → SQL Editor → paste contents of `supabase/migrations/00006_coaching_platform.sql` → Run.

Verify tables created:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'coach%' OR table_name = 'macro_targets' OR table_name = 'user_agreements';
```

Expected: `coach_profiles`, `coach_clients`, `macro_targets`, `coach_program_assignments`, `coach_subscriptions`, `user_agreements`
