# Tournament HQ

Mobile-first participant web app with a bottom navbar, personalized schedules, announcement delivery controls, interactive venue map, and an admin dashboard for schedule and messaging ops.

## Stack

- Next.js App Router
- Tailwind CSS
- Supabase-ready schema and client helper
- Local demo persistence for greenfield prototyping

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Environment

Create `.env.local` when you are ready to hook up Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Included Flows

- Welcome/home screen with aggressive install CTA
- Browser notification permission request with participant-friendly copy
- Optional phone verification flow for SMS-ready participants
- General schedule plus student-specific slot replacements from CSV-mapped overrides
- Announcement feed with public and targeted student-only delivery
- Interactive venue map
- Admin dashboard to edit schedule slots, upload CSV overrides, and compose markdown announcements with SMS/push toggles

## Supabase Handoff

- SQL schema lives in [`supabase/schema.sql`](./supabase/schema.sql)
- Browser client helper lives in [`lib/supabase.ts`](./lib/supabase.ts)
- Current persistence is local-first so the prototype runs before backend wiring

## Notes

- Phone verification is simulated through `/api/verify-phone` right now, which keeps the prototype testable without Twilio.
- Push permission is requested and service worker registration is set up, but actual web-push delivery still needs VAPID keys and a send pipeline.
