# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Project

Cinemate mobile — React Native / Expo Router client for the Cinemate backend (Letterboxd-taste
matching + chat). **Sibling repo, not a monorepo:** the backend lives at
`https://github.com/selenkelat/cinemate.git` (ASP.NET Core 8) — its `CLAUDE.md` is the source of
truth for API/DTO shapes, auth flow, and WebSocket protocol; don't guess a request/response shape
here, read it there. This repo has no server code and no web target — mobile-only (iOS/Android
via Expo Go during dev; no EAS/App Store build has been done yet).

## Hard constraints

- Secrets (none currently needed client-side — the backend holds TMDB/Cloudinary keys) never get
  hardcoded; the only per-machine config is `EXPO_PUBLIC_API_URL` in a gitignored `.env` (copy
  `.env.example`). No fallback URL in code on purpose — see `src/config.ts`'s comment.
- **Never run `git push`** — the user pushes manually. Commit freely.
- Don't add a new gesture/animation library for something `FlatList`'s `pagingEnabled` +
  `snapToInterval` (see the Matches deck) or core RN primitives already cover.

## Commands

```
npx expo start                             # dev server (also regenerates typed routes — see below)
npx tsc --noEmit                           # typecheck, run after every change
npx expo export --platform android         # headless bundle check, catches Metro-only errors tsc misses
```
No test suite / linter is enforced in this repo beyond `tsc`; verification is typecheck + export +
live device test over Expo Go (backend run with `dotnet run --urls http://0.0.0.0:5080` so it's
LAN-reachable, `.env`'s `EXPO_PUBLIC_API_URL` pointed at the host's LAN IP).

**Typed-routes gotcha:** `expo export` alone does NOT refresh `.expo/types/router.d.ts` for a
newly-added route file — a brief `npx expo start` run is needed to regenerate it before `tsc`
will recognize the new route.

## Architecture

**Routing** (`src/app/`, Expo Router, typed routes on): `(auth)/` (login, register) and `(app)/`
(everything post-login) are separate groups, each gated by its own `_layout.tsx` reading
`useAuth()` — `(app)/_layout` redirects to `/login` if signed out, `(auth)` presumably the
inverse. `(app)/index.tsx` is an invisible onboarding router, not a screen: it reads the caller's
own profile once and redirects to `/upload` (no watched movies yet), `/favorites` (watched but no
favorites picked), or `/profile` — one check covers fresh register, a resumed/interrupted
onboarding, and a normal login, with no separate state machine. `(app)/(tabs)/` holds the three
bottom tabs (Profile/Matches/Chat); `match/[userId].tsx`, `chat/[otherUserId].tsx`, `movie-list.tsx`,
`favorites.tsx`, `settings.tsx`, `upload.tsx` are pushed on top, outside the tab bar.

**Auth** (`src/auth/AuthContext.tsx`, `src/auth/secureStorage.ts`, `src/api/client.ts`): access
token lives only in a `useRef` (never state — nothing should re-render off it, and
`api/client.ts` reads it synchronously outside React); refresh token is the only thing persisted,
in `expo-secure-store` (Keychain/Keystore), since it's the long-lived (60-day) credential. Cold
start = one `refreshAccessToken()` call before rendering anything under `(app)`, so a valid
session never flashes the login screen. `client.ts`'s `apiRequest` does exactly **one**
refresh-and-retry on a 401 (not a loop — the backend treats a second reuse of the same refresh
token as theft and revokes everything, so retrying more would turn that into a hang). `client.ts`
can't import `AuthContext` (circular — `AuthContext` already imports `client.ts`), so the wiring
runs inverted: `AuthContext` calls `setAuthHandlers()` on mount to register `getAccessToken`/
`refreshAccessToken` callbacks into the module.

**Chat socket** (`src/chat/useChatSocket.ts`): raw RN `WebSocket` with an `Authorization: Bearer`
header passed as the (RN-only, not in the DOM lib TS signature — cast via `RNWebSocketCtor`) third
constructor argument. Verified live against the backend that header-based auth works with no
`?access_token=` fallback needed. One frame shape both directions (`{"body": "..."}` out,
`MessageDto` in) — no dispatch needed. `reconnect()` forces a fresh token via
`refreshAccessToken()` before reconnecting (used by the UI's "Reconnect" affordance after a
socket closed with a reason like an expired token).

**Theme** (`src/constants/theme.ts`, `src/hooks/use-theme.ts`): `Colors.light`/`Colors.dark` (text/
background/backgroundElement/backgroundSelected/textSecondary) + one shared `AccentColor` (green,
`#16A34A`) used as a literal everywhere a button/link/badge/tint needs it — not a `Colors.*` entry,
since nothing pulls it through `useTheme()`. `ThemedText`/`ThemedView` wrap RN's `Text`/`View` with
theme-aware styling (`themeColor` prop or semantic `type`, e.g. `linkPrimary` for `AccentColor`
links).

**API layer** (`src/api/`): one file per backend controller area (`auth.ts`, `profile.ts`,
`matches.ts`, `chat.ts`, `movies.ts`, `favorites.ts`, `avatar.ts`, `exports.ts`), each a thin
wrapper over `apiRequest<T>()` with TypeScript types mirroring the backend's `Models/Dto` records
1:1. `matches.ts`/`movies.ts`/`profile.ts` DTOs carry poster/avatar URLs as already-full delivery
URLs (TMDB CDN or Cloudinary) — the client never constructs an image URL itself.

## Known platform gotchas (already hit, don't re-debug)

- **Expo SDK 57's `fetch(uri).blob()` doesn't reliably set a correct `Content-Type` for a local
  `file://` upload** (ZIP export, avatar image) — bit both `ExportsController` and
  `AvatarController` on the backend. Fix lives server-side (validate by file extension, not
  `ContentType`), not here — but if a new file-upload feature is added, expect the same and don't
  trust the client-sent content type when writing the backend check.
- `rawRequest` in `client.ts` never sets `Content-Type` for a `FormData` body — `fetch` must
  compute its own multipart boundary; setting it manually breaks the upload.

## Commit conventions

Same as the backend: `[+]` new feature, `[#]` bug fix, `[~]` refactor/general change, format
`[prefix] Module: short summary` (imperative, <50 chars).

## Local-only docs

`.claude/PROGRESS.md` (gitignored, not in this file's scope) has the dated slice-by-slice history
for whoever has access to this specific machine's Claude Code session — this `AGENTS.md` is the
one that travels with the repo to other machines, so keep it about durable architecture, not
in-flight status.
