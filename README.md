# GMassist

Gmail virtual assistant that reads your inbox in the background, classifies actionable emails with AI, and delivers a daily digest with one-click actions.

## What it does

GMassist continuously monitors your Gmail and surfaces four categories of action items:

| Category | What it catches |
|---|---|
| **Meetings to add** | Calls/meetings mentioned in email that aren't on your calendar |
| **Needs reply** | Important emails you haven't responded to, including overdue ones |
| **Requests pending** | Tasks, approvals, and asks from others waiting on you |
| **Schedule meeting** | "Let's find a time" threads where you need to book a slot |

At your chosen time each day, GMassist sends either:
- **Push notification** → tap to open the dashboard, or
- **SMS digest** → summary + link to the app

## One-click actions

From the dashboard, each item supports:
- **Add to Calendar** — creates a Google Calendar event
- **Reply in Gmail** — opens a pre-filled compose window
- **Schedule Meeting** — opens Google Calendar event template
- **Open Email** — jumps to the thread in Gmail
- **Done / Snooze 24h** — clears or defers the item

---

## Quick start

### Prerequisites

- **Node.js 20+** and npm
- **Google Cloud project** with Gmail API + Calendar API enabled
- **OpenAI API key** (optional — falls back to keyword heuristics without it)
- **Twilio account** (only if you want SMS digest delivery)

### 1. Install

```bash
cd Projects/GMassist
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2. Google Cloud setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable APIs: **Gmail API**, **Google Calendar API**
4. Create **OAuth 2.0 credentials** (Web application):
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret into `.env`

### 3. Real-time Gmail (Pub/Sub) — recommended for production

Gmail push notifications require Google Cloud Pub/Sub:

1. Enable **Cloud Pub/Sub API**
2. Create a topic: `projects/YOUR_PROJECT/topics/gmassist-gmail`
3. Grant Gmail publish permission:
   ```
   gcloud pubsub topics add-iam-policy-binding gmassist-gmail \
     --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
     --role=roles/pubsub.publisher
   ```
4. Create a push subscription pointing to your webhook:
   ```
   https://YOUR_DOMAIN/api/gmail/webhook
   ```
5. Set in `.env`:
   ```
   GOOGLE_CLOUD_PROJECT_ID=your-project
   GMAIL_PUBSUB_TOPIC=projects/your-project/topics/gmassist-gmail
   GMAIL_WEBHOOK_SECRET=your-random-secret
   ```

For local dev without Pub/Sub, run the background worker instead (polls every 2 min):

```bash
npm run worker
```

### 4. Push notifications (optional)

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Add to `.env`:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

### 5. SMS digest (optional)

Sign up at [Twilio](https://www.twilio.com/) and add to `.env`:

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

Users choose SMS vs push during onboarding.

### 6. AI classification

Set your OpenAI key for best results:

```
OPENAI_API_KEY=sk-...
```

Without it, GMassist uses keyword heuristics (works but less accurate).

### 7. Daily digest cron

Schedule a cron job to hit `/api/cron/daily` every 15 minutes:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR_DOMAIN/api/cron/daily
```

On Vercel, add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/daily",
    "schedule": "*/15 * * * *"
  }]
}
```

---

## Architecture

```
Gmail inbox
    │
    ├── Pub/Sub push ──► /api/gmail/webhook ──► email-sync worker
    │                                              │
    └── (dev fallback) worker polls every 2min ────┘
                                                   │
                                              AI classifier
                                                   │
                                          ActionItem (SQLite)
                                                   │
                              ┌────────────────────┼────────────────────┐
                              ▼                    ▼                    ▼
                        Dashboard           Push notification         SMS
                     (one-click actions)    (daily digest)         (daily digest)
```

## Project structure

```
src/
├── app/
│   ├── page.tsx              Landing + Google sign-in
│   ├── dashboard/page.tsx    Action items dashboard
│   └── api/
│       ├── auth/             NextAuth (Google OAuth)
│       ├── gmail/            Sync + Pub/Sub webhook
│       ├── actions/          One-click action handlers
│       ├── digest/           Digest generation + delivery
│       ├── cron/             Scheduled jobs
│       └── notifications/    Push subscription
├── components/               UI components
├── lib/
│   ├── gmail.ts              Gmail API client
│   ├── calendar.ts           Google Calendar API
│   ├── ai/classifier.ts      OpenAI + heuristic classification
│   ├── digest/generator.ts   Daily digest logic
│   ├── notifications/        Push + SMS delivery
│   └── workers/email-sync.ts Background email processing
└── types/                    Shared TypeScript types
```

## Environment variables

See `.env.example` for the full list.

## Deploying

Works on Vercel, Railway, or any Node.js host. For production:

1. Switch `DATABASE_URL` to PostgreSQL (change provider in `prisma/schema.prisma`)
2. Set all env vars
3. Configure Pub/Sub for real-time sync
4. Set up cron for daily digests
5. Update Google OAuth redirect URI to your production domain

## License

MIT
