# Cinemate Mobile

React Native / Expo client for Cinemate. Talks to the backend in the sibling `cinemate_yeni`
repo — see that repo's `CLAUDE.md` for the API surface (auth, chat, blocking, read receipts).

## Tech stack

Expo (managed) · React Native · TypeScript · Expo Router (file-based navigation) ·
`expo-secure-store` (refresh token storage)

## Setup

```
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL — see below
npx expo start
```

Then, in the Expo CLI output: press `a` for an Android emulator, `i` for an iOS simulator
(requires a Mac), or scan the QR code with the **Expo Go** app (iOS App Store / Google Play) on a
physical device. No Mac is required for iOS development this way — Expo Go runs the JS bundle
directly, no Xcode build involved. A full native iOS build (for TestFlight/App Store) would go
through EAS Build's cloud macOS runners instead.

### Pointing at the backend

The backend defaults to `http://localhost:5080`, which is **not** reachable from an emulator or a
physical device as-is — `localhost` on those means the device itself, not your PC. Set
`EXPO_PUBLIC_API_URL` in `.env` to match how you're running things (see `.env.example` for all
three cases):

| Running on | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:5080` |
| Physical device (Expo Go, same Wi-Fi) | `http://<your PC's LAN IP>:5080` |
| iOS simulator (Mac only) | `http://localhost:5080` |

For the physical-device case, the backend also needs to be listening on all interfaces, not just
loopback:

```
dotnet run --urls http://0.0.0.0:5080
```

(run from the `cinemate_yeni` repo). If the phone still can't connect, check Windows Firewall —
it may prompt to allow `dotnet`/`node` through on first connection, or you may need an inbound
rule for ports 5080 (backend) and 8081 (Metro dev server) on your network's Private profile.

## Project structure

```
src/
  app/              # Expo Router screens (file-based routing)
    (auth)/           # login, register — public
    (app)/            # everything else — redirects to (auth)/login if signed out
  api/              # fetch wrapper + typed calls, mirroring Cinemate.Models.Dto 1:1
  auth/             # AuthContext (session state) + secureStorage (refresh token)
  components/       # themed-text/themed-view + shared UI primitives
```

Auth flow: `(auth)/login` and `(auth)/register` call `useAuth()`, which stores the access token
in memory and the refresh token in `expo-secure-store`. On cold start, `AuthContext` tries a
refresh before anything renders, so a valid session goes straight to `(app)` without flashing the
login screen. `(app)/_layout.tsx` and `(auth)/_layout.tsx` are the guards — signed-out users can't
reach `(app)`, signed-in users get redirected out of `(auth)`.

## Status

Scaffolding + register/login/logout against the real backend. Chat, matching/profile screens,
export upload, and push notifications are not built yet.
