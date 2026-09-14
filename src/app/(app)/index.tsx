import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ApiError } from '@/api/client';
import { profileApi } from '@/api/profile';
import { useAuth } from '@/auth/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type OnboardingTarget = '/upload' | '/favorites' | '/profile';

// Invisible router, not a screen: every signed-in user passes through "/" and is bounced
// straight to wherever they actually are in the import -> favorites -> profile chain. This one
// check (read off the profile the user already has) covers register, a resumed/interrupted
// onboarding, and a normal login by an already-onboarded user, with no special-casing between
// them.
export default function OnboardingGateScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [target, setTarget] = useState<OnboardingTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setError(null);
    try {
      const profile = await profileApi.get(user!.id);
      if (profile.watchedCount === 0) setTarget('/upload');
      else if (profile.favoriteMovies.length === 0) setTarget('/favorites');
      else setTarget('/profile');
    } catch (err) {
      console.error('Onboarding check failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    }
  }, [user]);

  useEffect(() => {
    check();
  }, [check]);

  if (target) {
    return <Redirect href={target} />;
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error}</ThemedText>
        <Pressable style={styles.button} onPress={check}>
          <ThemedText style={styles.buttonText}>Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator color={theme.text} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  error: { color: '#d33', textAlign: 'center' },
  button: {
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
