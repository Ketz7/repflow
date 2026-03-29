# RepFlow

A mobile-first fitness tracker PWA with workout programs, live session logging, body weight trends, and nutrition tracking.

**Live App: [repflow-one.vercel.app](https://repflow-one.vercel.app)**

## Features

- Google OAuth login (Gmail only)
- Browse and create workout programs (PPL, Upper/Lower, Full Body, etc.)
- 8-week phase calendar with drag-and-drop scheduling
- Live workout sessions with set/rep/weight logging and YouTube exercise demos
- Body weight tracking with 7-day moving average chart
- Daily steps and macros (protein, carbs, fat) logging
- Personal records tracking
- Exercise library with 68+ exercises across muscle groups
- PWA — installable on Android and iOS home screens
- Dark mode only — Deep Ocean aesthetic

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Backend/DB:** Supabase (PostgreSQL + Auth + Row-Level Security)
- **Hosting:** Vercel
- **PWA:** Serwist (service worker + offline caching)
- **Styling:** Tailwind CSS v4 (Deep Ocean theme)
- **Animations:** Framer Motion
- **Charts:** Recharts

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Production Build

```bash
npx next build --webpack
```

The `--webpack` flag is required for Serwist PWA service worker generation.
