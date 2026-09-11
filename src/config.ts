// EXPO_PUBLIC_-prefixed env vars are inlined by Expo at build/start time (see .env.example).
// No fallback to a real URL here: pointing at a machine-specific address by accident (an old
// LAN IP that now belongs to someone else, or an emulator alias when running on a device) is a
// worse failure mode than a loud crash on startup with a clear fix.
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiBaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and point it at the backend ' +
      '(10.0.2.2 for the Android emulator, your machine\'s LAN IP for a physical device).',
  );
}

export const API_BASE_URL = apiBaseUrl;
