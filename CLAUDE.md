# Loovy — Claude Code Project Notes

## Runtime

This is a **React Native / Expo iOS app**. It does not run in a browser.

- No web dev server is used. Skip all browser-preview verification steps.
- Do **not** call `preview_start`, `preview_screenshot`, or any `preview_*` tool.
- Testing is done on a physical device or iOS Simulator via `npx expo start`.

## Branch workflow

Every new feature or fix goes on its own branch (`feat/*`, `fix/*`, `docs/*`).
GitHub Actions (`.github/workflows/ci.yml`) runs a syntax check and auto-merges
passing branches to `master`.

## Stack

- React Native + Expo SDK
- AsyncStorage (local, migrating to Supabase)
- Supabase client already in `src/services/supabase.js` (needs real credentials)

See `ARCHITECTURE.md` for the full backend plan.
