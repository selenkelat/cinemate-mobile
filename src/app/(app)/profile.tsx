import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { profileApi, type UserProfileDto } from '@/api/profile';
import { useAuth } from '@/auth/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await profileApi.get(user!.id);
      setProfile(result);
    } catch (err) {
      console.error('Load profile failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error}</ThemedText>
        <Pressable style={styles.button} onPress={load}>
          <ThemedText style={styles.buttonText}>Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // TasteProfileService.GetProfileAsync only 404s for an unknown user id, never for "no import
  // yet" — an authenticated user always has a profile, just an all-zero one. So "not imported" is
  // read off watchedCount, not off a request failure.
  if (!profile || profile.watchedCount === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="title" style={styles.title}>
          No taste profile yet
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.hint}>
          Upload your Letterboxd export to build your taste profile.
        </ThemedText>
        <Pressable style={styles.button} onPress={() => router.push('/upload')}>
          <ThemedText style={styles.buttonText}>Upload export</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        My Profile
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <StatRow label="Watched" value={profile.watchedCount} />
        <StatRow label="Rated" value={profile.ratedCount} />
        <StatRow label="Liked" value={profile.likedCount} />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          Ratings
        </ThemedText>
        {profile.ratingStats.count === 0 ? (
          <ThemedText themeColor="textSecondary">No ratings yet.</ThemedText>
        ) : (
          <>
            <StatRow label="Average" value={profile.ratingStats.average!} />
            <StatRow label="Median" value={profile.ratingStats.median!} />
          </>
        )}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          Genres
        </ThemedText>
        {profile.genreProfile.slice(0, 8).map((genre) => (
          <View key={genre.genre} style={styles.genreRow}>
            <View style={styles.genreLabelRow}>
              <ThemedText type="small">{genre.genre}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {genre.percentage}%
              </ThemedText>
            </View>
            <View style={[styles.genreBarTrack, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.genreBarFill, { width: `${Math.min(genre.percentage, 100)}%` }]} />
            </View>
          </View>
        ))}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          Favorites
        </ThemedText>
        {profile.favoriteMovies.length === 0 ? (
          <ThemedText themeColor="textSecondary">You haven&apos;t picked any favorites yet.</ThemedText>
        ) : (
          profile.favoriteMovies.map((favorite) => (
            <ThemedText key={favorite.movieId}>
              {favorite.rank}. {favorite.title}
            </ThemedText>
          ))
        )}
      </ThemedView>

      <Pressable style={styles.button} onPress={() => router.push('/favorites')}>
        <ThemedText style={styles.buttonText}>
          {profile.favoriteMovies.length === 0 ? 'Choose favorites' : 'Edit favorites'}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <ThemedText>{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center' },
  hint: { textAlign: 'center' },
  error: { color: '#d33', textAlign: 'center' },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { marginBottom: Spacing.one },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genreRow: { gap: Spacing.half },
  genreLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genreBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  genreBarFill: { height: 6, backgroundColor: '#208AEF' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
