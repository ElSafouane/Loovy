# Loovy — Architecture & Technical Requirements

> **Goal**: a simple, scalable architecture for a **couples-only** iOS app.
> Each feature is shared in real-time between exactly two users (one couple).

---

## 1. Current State (as of this writing)

| Layer | Status |
|-------|--------|
| Frontend | React Native + Expo |
| Data persistence | `AsyncStorage` — **local device only** |
| Backend / sync | None (Supabase client scaffolded but unused) |
| Auth | None |
| Real-time | None |

**Problem**: right now both partners each have a completely independent copy of the app — memories, capsules, and events are not shared between them at all.

---

## 2. Recommended Stack (simple, no custom server)

```
┌─────────────────────────────────────────────────┐
│              React Native (Expo)                │
│  HomeScreen · MemoriesScreen · SettingsScreen   │
│         OnboardingScreen · DatesScreen          │
└──────────────────┬──────────────────────────────┘
                   │ Supabase JS SDK
┌──────────────────▼──────────────────────────────┐
│                  SUPABASE                       │
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Auth   │  │ Database │  │    Storage    │  │
│  │(email / │  │(Postgres │  │ (photos for   │  │
│  │ magic   │  │+ Realtime│  │  memories)    │  │
│  │  link)  │  │  sync)   │  │               │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  Edge Functions (optional / future)      │   │
│  │  • send push notification when capsule   │   │
│  │    unlocks (Expo Push API call)           │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Why Supabase?**
- Already scaffolded in `src/services/supabase.js`
- Handles Auth, Postgres DB, real-time subscriptions, and file storage
- Free tier is enough for two users
- No custom backend code needed for the MVP

---

## 3. Authentication

### Model: Email + Magic Link (passwordless)

1. User opens app → enters email address
2. Supabase sends a one-click magic link (no password to forget)
3. On first sign-in → Onboarding flow (name, avatar, anniversary)

### Couple Pairing

Two partners need to be linked under a single `couple_id`.

**Flow**:
```
Partner A signs up
  └─► receives a 6-character invite code (stored in `couples` table)
  └─► shares code with Partner B (copy/share sheet)

Partner B signs up
  └─► enters the invite code
  └─► both users are now linked to the same couple_id
  └─► all shared data is scoped to that couple_id
```

**Rules**:
- A couple has exactly 2 members — no more
- If Partner B is already paired, the code is rejected
- A user can only belong to one couple at a time

---

## 4. Database Schema

```sql
-- One row per couple
CREATE TABLE couples (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,       -- 6-char code for pairing
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- User profile (extends Supabase auth.users)
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users,
  couple_id        UUID REFERENCES couples(id),
  name             TEXT,
  avatar_url       TEXT,
  status           TEXT,
  love_language    TEXT,
  timezone_offset  INT DEFAULT 0,
  fcm_token        TEXT,                  -- for push notifications
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Shared timeline memories
CREATE TABLE memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id   UUID REFERENCES couples(id) NOT NULL,
  created_by  UUID REFERENCES profiles(id),
  title       TEXT NOT NULL,
  description TEXT,
  date        DATE NOT NULL,
  emoji       TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Time capsule messages
CREATE TABLE capsules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id    UUID REFERENCES couples(id) NOT NULL,
  author_id    UUID REFERENCES profiles(id),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  unlock_date  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  is_opened    BOOLEAN DEFAULT false
);

-- Shared event countdowns
CREATE TABLE events (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  title     TEXT NOT NULL,
  date      TIMESTAMPTZ NOT NULL,
  icon      TEXT DEFAULT 'star',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Couple profile extras (song, nickname, special place, promise)
CREATE TABLE couple_extras (
  couple_id        UUID PRIMARY KEY REFERENCES couples(id),
  nickname         TEXT,
  relationship_song TEXT,
  special_place    TEXT,
  promise          TEXT,
  anniversary_date DATE
);
```

**Row-Level Security (RLS)**: every table has a policy that only allows reads/writes if `auth.uid()` belongs to the row's `couple_id`. This means the Supabase anon key is safe to ship in the app.

---

## 5. Real-time Sync

Supabase Realtime lets the app subscribe to DB changes. When Partner A adds a memory, Partner B's app updates instantly — no polling needed.

Screens that need live subscriptions:

| Screen | Subscribes to |
|--------|--------------|
| HomeScreen | `profiles` (partner status), `events` |
| MemoriesScreen | `memories`, `capsules` |
| SettingsScreen | `profiles`, `couple_extras` |

---

## 6. File Storage (Photos in Memories)

- Bucket: `memories-photos` (private, accessible only to the couple)
- On upload: image goes to Supabase Storage → public URL stored in `memories.image_url`
- Images are served via Supabase CDN — no extra config needed

---

## 7. Push Notifications

- Use **Expo Push Notifications** on the app side
- Store the Expo push token in `profiles.fcm_token`
- For capsule unlocks: a Supabase Edge Function runs on a cron (daily) and sends a notification to both partners when `capsules.unlock_date <= now()`
- For status updates / new memories: trigger directly from the app (call Expo Push API from the client after a write)

---

## 8. Feature → Backend Requirement Map

| Feature | Requires |
|---------|---------|
| Partner sees your status in real time | `profiles` table + Realtime subscription |
| Shared timeline memories | `memories` table + Storage for photos |
| Time capsules | `capsules` table + Edge Function cron for unlock notification |
| Shared event countdowns | `events` table + Realtime |
| Distance between partners | `profiles.timezone_offset` + GPS coords (sent periodically, **not stored long-term** for privacy) |
| Couple profile (song, nickname…) | `couple_extras` table |
| Onboarding | `profiles` insert after auth |
| Pairing two accounts | `couples.invite_code` flow |

---

## 9. Migration Path from AsyncStorage

The app currently uses `AsyncStorage` for everything. The migration path is:

1. **Phase 1 (current)** — AsyncStorage only. Both users manage their own data. *(Done)*
2. **Phase 2** — Add Supabase Auth + `profiles` table. Onboarding writes to Supabase. Partner status syncs.
3. **Phase 3** — Migrate `memories`, `capsules`, `events` to Supabase tables. Remove AsyncStorage for shared data.
4. **Phase 4** — Add real-time subscriptions on each screen. Remove all polling/local-first patterns.

---

## 10. Environment Variables

Create a `.env` file (never commit it — it's in `.gitignore`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

The anon key is safe to ship — Row Level Security ensures users can only access their couple's data.

---

## 11. Folder Structure (target)

```
src/
├── services/
│   ├── supabase.js          # Supabase client (already exists)
│   ├── auth.js              # sign in / sign up / magic link
│   ├── couples.js           # pairing, invite code logic
│   └── storage.js           # photo upload helpers
├── hooks/
│   ├── useCouple.js         # couple_id, partner profile
│   ├── useMemories.js       # real-time memories subscription
│   ├── useCapsules.js       # real-time capsules subscription
│   └── useEvents.js         # real-time events subscription
├── screens/
│   ├── HomeScreen.js
│   ├── MemoriesScreen.js
│   ├── SettingsScreen.js
│   ├── OnboardingScreen.js
│   ├── DatesScreen.js
│   └── PairingScreen.js     # new — enter invite code
├── navigation/
│   └── TabNavigator.js
└── theme/
    └── colors.js
```

---

## 12. What Does NOT Need a Backend

- **Distance calculation** — Haversine formula runs on-device with GPS coords. Only share coords transiently.
- **Countdown timers** — Pure client-side date math.
- **Mood picker** — Local UI state; only the selected status is synced.
- **Theme / colours** — Local only.

---

## 13. Security Checklist

- [ ] Enable Row Level Security on all tables
- [ ] Never store GPS history — only broadcast current location ephemerally
- [ ] Capsule messages are encrypted at rest by Supabase (Postgres encryption)
- [ ] Invite codes expire after 24 hours or first use
- [ ] Magic links expire after 1 hour (Supabase default)
