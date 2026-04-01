# RepFlow Coaching Platform — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Approach:** Separate Coach Profile Table (Approach B)

---

## 1. Overview

Add a premium coaching layer to RepFlow. Coaches can manage up to 25 clients, set macro targets, assign programs, and track client progress. Users can browse and request coaches. Revenue comes from a flat monthly fee + per-client fee charged to coaches (managed manually).

### Scope

- Coach role system with admin approval
- Bidirectional coach-client connections
- Macro target setting with tiered compliance feedback
- Program assignment (fixed duration or open-ended)
- Coach dashboard with at-a-glance client overview
- Terms of Service and coaching waiver (in-app acceptance)
- Workout session UX fixes (alignment, swipe removal, exercise swap)

### Out of Scope

- In-app payment processing (Stripe/Razorpay)
- Meal plan creation (specific meals/foods)
- Coach editing client logs
- Chat/messaging between coach and client
- Subdomains or multi-tenant isolation

---

## 2. Database Schema

### 2.1 `coach_profiles`

Extends a user into a coach. One-to-one with `users`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default uuid_generate_v4() | |
| user_id | uuid | FK → users(id) CASCADE, UNIQUE, NOT NULL | |
| bio | text | NOT NULL, default '' | Public description |
| experience | text | NOT NULL, default '' | Qualifications/background |
| photo_url | text | | Coach headshot |
| status | text | NOT NULL, default 'pending', CHECK (pending/approved/suspended) | |
| max_clients | integer | NOT NULL, default 25 | |
| monthly_rate | decimal | | Display-only: what coach charges clients |
| created_at | timestamptz | NOT NULL, default now() | |

### 2.2 `coach_clients`

Coach-client relationship. Bidirectional creation (coach invites or client requests).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default uuid_generate_v4() | |
| coach_id | uuid | FK → coach_profiles(id) CASCADE, NOT NULL | |
| client_id | uuid | FK → users(id) CASCADE, NOT NULL | |
| status | text | NOT NULL, default 'pending', CHECK (pending/active/expired) | |
| initiated_by | text | NOT NULL, CHECK (coach/client) | Who sent the request |
| started_at | date | | Set when status → active |
| expires_at | date | | Null = open-ended subscription |
| price | decimal | | What client pays this coach |
| notes | text | | Coach's private notes on client |
| created_at | timestamptz | NOT NULL, default now() | |
| **UNIQUE** | | (coach_id, client_id) | No duplicate relationships |

**Index:** `idx_coach_clients_coach_id` on `coach_id` for dashboard queries.
**Index:** `idx_coach_clients_client_id` on `client_id` for client lookups.

### 2.3 `macro_targets`

Coach-set nutrition targets per client. Supports history via `effective_date`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default uuid_generate_v4() | |
| coach_client_id | uuid | FK → coach_clients(id) CASCADE, NOT NULL | |
| protein | decimal | NOT NULL | Grams |
| carbs | decimal | NOT NULL | Grams |
| fat | decimal | NOT NULL | Grams |
| effective_date | date | NOT NULL | When this target starts |
| created_at | timestamptz | NOT NULL, default now() | |

**Index:** `idx_macro_targets_client_date` on `(coach_client_id, effective_date DESC)` for fetching current targets.

### 2.4 `coach_program_assignments`

Coach pushes a program to a client.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default uuid_generate_v4() | |
| coach_client_id | uuid | FK → coach_clients(id) CASCADE, NOT NULL | |
| program_id | uuid | FK → programs(id) CASCADE, NOT NULL | |
| duration_weeks | integer | | Null = open-ended |
| started_at | date | NOT NULL | |
| ended_at | date | | Null until completed/swapped |
| status | text | NOT NULL, default 'active', CHECK (active/completed/swapped) | |
| created_at | timestamptz | NOT NULL, default now() | |

### 2.5 `coach_subscriptions`

Tracks what coaches owe you (admin-managed).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default uuid_generate_v4() | |
| coach_id | uuid | FK → coach_profiles(id) CASCADE, NOT NULL | |
| base_fee | decimal | NOT NULL | Monthly flat fee |
| per_client_fee | decimal | NOT NULL, default 0 | Per active client fee |
| status | text | NOT NULL, default 'active', CHECK (active/expired/cancelled) | |
| current_period_start | date | NOT NULL | |
| current_period_end | date | NOT NULL | |
| created_at | timestamptz | NOT NULL, default now() | |

### 2.6 `user_agreements`

Stores ToS and waiver acceptances.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default uuid_generate_v4() | |
| user_id | uuid | FK → users(id) CASCADE, NOT NULL | |
| document_type | text | NOT NULL, CHECK (tos/coaching_waiver) | |
| document_version | text | NOT NULL | e.g., "1.0", "1.1" |
| accepted_at | timestamptz | NOT NULL, default now() | |
| ip_address | text | | For legal records |

**UNIQUE:** `(user_id, document_type, document_version)` — one acceptance per version.

---

## 3. RLS Policies

### 3.1 `coach_profiles`

- **SELECT:** All authenticated users can read profiles where `status = 'approved'`. Coaches can read their own profile regardless of status. Admins can read all.
- **INSERT:** Any authenticated user can insert one row (their own `user_id`).
- **UPDATE:** Coach can update their own row EXCEPT the `status` field. Admins can update any row including `status`.
- **DELETE:** Admins only.

### 3.2 `coach_clients`

- **SELECT:** Coach can read rows where `coach_id` = their coach_profile id. Client can read rows where `client_id` = their user id. Admins can read all.
- **INSERT:** Coach can insert (initiated_by = 'coach') if their client count < max_clients. User can insert (initiated_by = 'client') for any approved coach under max_clients.
- **UPDATE:** The **other party** can update `status` to 'active' (acceptance). Either party can update `status` to 'expired'. Coach can update `notes`, `expires_at`, `price`.
- **DELETE:** Admins only (use status = 'expired' for normal disconnection).

### 3.3 `macro_targets`

- **SELECT:** Coach can read for their own clients. Client can read their own targets.
- **INSERT/UPDATE:** Coach can write for their own active clients only.
- **DELETE:** Coach can delete for their own clients.

### 3.4 `coach_program_assignments`

- **SELECT:** Coach can read for their own clients. Client can read their own assignments.
- **INSERT/UPDATE:** Coach can write for their own active clients only.
- **DELETE:** Coach only, for their own clients.

### 3.5 Coach access to client data (existing tables)

Add new SELECT policies to these existing tables:

- **`body_weight_logs`:** Coach can read logs where `user_id` is an active client of theirs.
- **`workout_sessions`:** Coach can read sessions where `user_id` is an active client.
- **`session_sets`:** Coach can read sets for sessions belonging to their active clients.
- **`phases` / `phase_schedules`:** Coach can read for their active clients.

Pattern for all: `WHERE user_id IN (SELECT client_id FROM coach_clients cc JOIN coach_profiles cp ON cc.coach_id = cp.id WHERE cp.user_id = auth.uid() AND cc.status = 'active')`

### 3.6 `coach_subscriptions`

- **SELECT:** Coach can read their own. Admins can read all.
- **INSERT/UPDATE/DELETE:** Admins only.

### 3.7 `user_agreements`

- **SELECT:** User can read their own. Admins can read all.
- **INSERT:** User can insert their own (acceptance).
- **UPDATE/DELETE:** None (immutable records).

---

## 4. User Flows

### 4.1 Becoming a Coach

1. User navigates to Profile → taps "Become a Coach"
2. Fills form: photo upload, bio, experience, monthly rate
3. Accepts coaching ToS (stored in `user_agreements`)
4. Submits → `coach_profiles` row created with `status: pending`
5. Profile page shows "Application under review" state
6. Admin sees pending application in Admin panel → taps Approve
7. `status` → `approved`, coaching dashboard unlocks
8. Coach pays you (external) → you create `coach_subscriptions` row from admin

### 4.2 Client Finds a Coach

1. User taps "Find a Coach" button on Profile page
2. Navigates to `/coaches` — grid of approved coach cards (photo, name, bio snippet, rate)
3. Taps a coach → full profile page with bio, experience, rate, "Request Coaching" button
4. Taps "Request Coaching" → accepts coaching waiver (stored in `user_agreements`)
5. `coach_clients` row created: `status: pending`, `initiated_by: client`
6. Coach sees request on their dashboard → Approve / Decline
7. On approval → `status: active`, `started_at` set to today
8. Coach sets macro targets + assigns program

### 4.3 Coach Adds a Client

1. Coach taps "Add Client" on dashboard
2. Searches users by name or email
3. Selects a user → `coach_clients` row: `status: pending`, `initiated_by: coach`
4. Client sees banner/notification on their Profile page: "[Coach Name] wants to coach you"
5. Client taps Accept (with coaching waiver acceptance) → `status: active`
6. Client taps Decline → row deleted or `status: expired`

### 4.4 Coach Day-to-Day

1. Coach opens app → home page has toggle: "My Workouts" | "My Clients"
2. "My Clients" shows the client dashboard
3. At-a-glance cards for each client:
   - Name, avatar, subscription status dot (green/amber/red)
   - Current program + week (e.g., "PPL — Week 3 of 8")
   - Today's macro bar (filled vs target, tiered color)
   - Activity icons: logged today? worked out today?
   - Subscription expiry (amber if < 7 days, red if expired)
4. Tap a client → detail view with tabs:
   - **Overview:** Weight chart, current program progress, macro compliance (7-day)
   - **Macros:** Set/edit P/C/F targets, target change history, daily compliance
   - **Program:** Current assignment, assign new program, set duration
   - **Activity:** Workout session history with sets/reps/weights
   - **Settings:** Subscription dates, price, notes, disconnect

### 4.5 Client Experience (When Coached)

1. Client logs macros on Profile page as normal
2. If coach has set targets, the UI shows targets alongside logged values
3. Calorie bar with tiered feedback:
   - **Green:** At or below target
   - **Amber:** Up to 300 kcal over target
   - **Red:** More than 300 kcal over target
4. Program assigned by coach appears in Programs/Calendar as normal
5. Client can adjust which days to train (schedule flexibility)
6. Client cannot swap the assigned program — only the coach can change it
7. Client's Progress page shows targets as reference lines on charts

---

## 5. Terms of Service & Legal

### 5.1 Storage

ToS and waivers stored as versioned documents. User must accept current version to use features. If version changes, re-acceptance required on next visit.

`user_agreements` table tracks: user_id, document_type (tos/coaching_waiver), document_version, accepted_at, ip_address.

### 5.2 ToS Content (General — all users)

Covers:
- **Nature of Service:** RepFlow is a fitness tracking tool, not a medical or dietary service
- **No Medical Advice:** Content on this platform (including coach recommendations) does not constitute medical, nutritional, or professional health advice
- **Assumption of Risk:** User acknowledges that physical exercise and dietary changes carry inherent risks. User assumes full responsibility for their health decisions
- **Limitation of Liability:** RepFlow, its operators, and affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from use of the service
- **Indemnification:** User agrees to indemnify and hold harmless RepFlow from any claims, damages, or expenses arising from their use of the service
- **User Conduct:** Users must not misuse the platform, share harmful advice, or impersonate professionals
- **Data Privacy:** User consents to data collection and processing as described. When connecting with a coach, user acknowledges the coach will have access to their fitness data
- **Account Termination:** RepFlow reserves the right to suspend or terminate accounts at its discretion
- **Age Requirement:** Users must be 18 years or older
- **Modifications:** RepFlow may update these terms; continued use constitutes acceptance
- **Governing Law:** Governed by laws of India (user's jurisdiction). Disputes resolved through arbitration
- **Severability:** If any provision is unenforceable, remaining provisions remain in effect
- **Entire Agreement:** This ToS constitutes the entire agreement between user and RepFlow

### 5.3 Coaching Waiver Content (Coach-client specific)

Shown when a client accepts a coach or when a coach accepts a client:

- **Independent Relationship:** Coaches are independent service providers, not employees or agents of RepFlow
- **Not Professional Advice:** Coaching provided through RepFlow is general fitness guidance, not licensed medical, nutritional, or therapeutic advice
- **Coach Qualifications:** RepFlow does not verify, certify, or guarantee coach qualifications. Users should independently verify their coach's credentials
- **Assumption of Risk:** Client acknowledges that following a coach's program or nutrition recommendations is done at their own risk
- **No Guarantee of Results:** Neither RepFlow nor the coach guarantees any specific fitness, health, or aesthetic outcomes
- **Liability Waiver:** Client waives all claims against RepFlow arising from the coaching relationship. Any disputes are solely between client and coach
- **Data Sharing Consent:** Client explicitly consents to their coach viewing their workout logs, body weight, nutrition data, and progress metrics
- **Termination:** Either party may end the coaching relationship at any time through the app

### 5.4 Acceptance Flow

1. **First login (all users):** Modal with ToS. Must scroll to bottom + tap "I Accept" to proceed. Stored in `user_agreements`.
2. **Coaching connection (clients):** Bottom sheet with coaching waiver when accepting/requesting a coach. Must tap "I Understand & Accept". Stored in `user_agreements`.
3. **Version check:** On app load, check if user has accepted the latest version. If not, show acceptance modal again. Block access until accepted.

---

## 6. Coach Dashboard UI

### 6.1 Home Page Toggle

Coaches see a segmented control at the top of the home page:
- **"My Workouts"** — existing home page content (today's schedule, recent sessions)
- **"My Clients"** — coach dashboard

Non-coaches see the regular home page with no toggle.

### 6.2 Client Card (At-a-Glance)

```
┌──────────────────────────────────────────────────┐
│ 🟢 [Avatar] John Doe                   ⚠️ 5d left│
│ PPL — Week 3 of 8                                │
│ ██████████░░░ 1,820 / 2,100 kcal                 │
│ ✓ Logged today   ✓ Worked out                    │
└──────────────────────────────────────────────────┘
```

- **Status dot:** Green = active, Amber = expires within 7 days, Red = expired
- **Macro bar:** Gradient fill. Green = on target, Amber = up to 300 cal over, Red = 300+ over
- **Activity:** Check marks for today's log and workout completion
- **Glassmorphism styling** consistent with existing app design

### 6.3 Client Detail View

Accessed by tapping a client card. Full-screen page with tabs:

| Tab | Content |
|-----|---------|
| Overview | Weight trend chart (7-day MA), current program + week, macro compliance sparkline |
| Macros | Current P/C/F targets with edit, target history timeline, daily macro log (14 days) |
| Program | Current assignment details, "Assign New Program" button, duration/status |
| Activity | Workout session list with expandable set details |
| Settings | Subscription dates, price, private notes, "Disconnect Client" button |

### 6.4 Coach Browse Page (`/coaches`)

- Accessible from Profile page via "Find a Coach" button
- Grid of coach cards: photo, name, bio (2 lines), monthly rate
- Tap → full coach profile page
- "Request Coaching" CTA button on profile page
- Only shows `status = 'approved'` coaches

---

## 7. Workout Session Fixes

### 7.1 Column Alignment Fix

**Current:** `grid-cols-[40px_1fr_1fr_48px]` — two flexible columns cause misalignment.
**Fix:** `grid-cols-[36px_72px_1fr_44px]` — Set and Reps get fixed widths, Weight gets remaining space, Done button fixed.

Apply to both the header row and each set row.

### 7.2 Swipe Navigation Removal

**Current:** Touch handlers on parent div capture horizontal swipes (> 60px threshold) and navigate between exercises. Conflicts with input interaction.
**Fix:** Remove `onTouchStart` and `onTouchEnd` handlers entirely. Navigation via:
- Prev/Next buttons (bottom of screen)
- Tappable exercise indicator dots (top of screen)

### 7.3 Exercise Swap

**Trigger:** Swap icon (↔) next to exercise name in session view.
**Behavior:**
1. Tap swap icon → bottom sheet opens with exercise library
2. Exercises grouped by muscle group (same as `/exercises` page)
3. Search/filter available
4. Select replacement → exercise swaps for **this session only**
5. Program template is NOT modified
6. Swapped exercise inherits same target sets/reps
7. `session_sets` naturally tracks the actual exercise_id performed

---

## 8. Admin Panel Additions

### 8.1 Coach Management

- List of all coach applications (pending/approved/suspended)
- Approve/Suspend toggle per coach
- View coach details: bio, client count, subscription status

### 8.2 Subscription Management

- Create/edit `coach_subscriptions` for each coach
- Set base_fee, per_client_fee, period dates
- Mark as active/expired/cancelled
- Dashboard showing: total coaches, total revenue, upcoming renewals

### 8.3 Overview Metrics

- Total coaches (pending/approved)
- Total active coaching relationships
- Revenue summary (monthly)

---

## 9. TypeScript Types (New)

```typescript
interface CoachProfile {
  id: string;
  user_id: string;
  bio: string;
  experience: string;
  photo_url: string | null;
  status: "pending" | "approved" | "suspended";
  max_clients: number;
  monthly_rate: number | null;
  created_at: string;
  user?: UserProfile; // joined
}

interface CoachClient {
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
  client?: UserProfile; // joined
  coach?: CoachProfile; // joined
}

interface MacroTarget {
  id: string;
  coach_client_id: string;
  protein: number;
  carbs: number;
  fat: number;
  effective_date: string;
  created_at: string;
}

interface CoachProgramAssignment {
  id: string;
  coach_client_id: string;
  program_id: string;
  duration_weeks: number | null;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "swapped";
  created_at: string;
  program?: Program; // joined
}

interface CoachSubscription {
  id: string;
  coach_id: string;
  base_fee: number;
  per_client_fee: number;
  status: "active" | "expired" | "cancelled";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

interface UserAgreement {
  id: string;
  user_id: string;
  document_type: "tos" | "coaching_waiver";
  document_version: string;
  accepted_at: string;
  ip_address: string | null;
}
```

---

## 10. New Routes

| Route | Purpose |
|-------|---------|
| `/coaches` | Browse approved coaches (public listing) |
| `/coaches/[id]` | Individual coach profile page |
| `/coaches/apply` | Coach application form |
| `/coach/dashboard` | Coach's client management dashboard |
| `/coach/clients/[id]` | Detailed client view (tabs) |
| `/profile/admin` (extended) | Add coach management + subscription sections |

---

## 11. Migration Plan

Single migration file `00006_coaching_platform.sql` containing:
1. Create `coach_profiles` table
2. Create `coach_clients` table with indexes
3. Create `macro_targets` table with index
4. Create `coach_program_assignments` table
5. Create `coach_subscriptions` table
6. Create `user_agreements` table
7. All RLS policies for new tables
8. Additional SELECT policies on existing tables for coach data access
