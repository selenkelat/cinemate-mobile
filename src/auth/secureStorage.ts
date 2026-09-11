import * as SecureStore from 'expo-secure-store';

// The refresh token is the one credential worth Keychain/Keystore-backed storage — it's the
// long-lived (60-day) one, and unlike the access token it needs to survive an app restart. The
// access token lives only in memory (see AuthContext) since it's short-lived and cheaply
// re-derived from this on cold start.
const REFRESH_TOKEN_KEY = 'cinemate.refreshToken';

export const secureStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clearRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
