import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { matchesApi, type MatchResultDto } from '@/api/matches';
import { Avatar } from '@/components/avatar';
import { CategoryBox } from '@/components/category-box';
import { FavoriteMovieRow } from '@/components/favorite-movie-row';
import { PremiumCta } from '@/components/premium-cta';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function MatchDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const theme = useTheme();
  const [match, setMatch] = useState<MatchResultDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 403 = outside the caller's free-tier picks for today. Retrying can't change that, so it gets
  // its own state with a Back button instead of the generic error + "Try again".
  const [isLocked, setIsLocked] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsLocked(false);
    try {
      const result = await matchesApi.get(Number(userId));
      setMatch(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setIsLocked(true);
        return;
      }
      console.error('Load match detail failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

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

  // Deliberately no "Message" button here: the backend doesn't yet stop a free user from opening
  // a new chat by id, and offering it from this screen would just route around the paywall.
  if (isLocked) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle" style={styles.name}>
          Premium match
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.lockedText}>
          This match isn&apos;t in today&apos;s free picks.
        </ThemedText>
        <PremiumCta description="Unlock every match, every day." />
        <Pressable onPress={() => router.back()}>
          <ThemedText type="linkPrimary">Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (error || !match) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error ?? 'Something went wrong.'}</ThemedText>
        <Pressable style={styles.button} onPress={load}>
          <ThemedText style={styles.buttonText}>Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const openOverlap = (title: string, movies: MatchResultDto['watchedOverlap']['movies']) => {
    router.push({ pathname: '/movie-list', params: { title, movies: JSON.stringify(movies) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Avatar avatarUrl={match.avatarUrl} displayName={match.displayName} style={styles.avatar} />
      <ThemedText type="subtitle" style={styles.name}>
        {match.displayName}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.username}>
        @{match.username}
      </ThemedText>

      <ThemedText type="title" style={styles.score}>
        {Math.round(match.overallScore)}%
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        overall match
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <StatRow label="Genre similarity" value={`${match.genreSimilarity}%`} />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          Favorites
        </ThemedText>
        {match.otherFavoriteMovies.length === 0 ? (
          <ThemedText themeColor="textSecondary">{match.displayName} hasn&apos;t picked any favorites yet.</ThemedText>
        ) : (
          match.otherFavoriteMovies.map((favorite) => <FavoriteMovieRow key={favorite.movieId} favorite={favorite} />)
        )}
      </ThemedView>

      <CategoryBox
        title="Liked together"
        count={match.likedOverlap.count}
        onPress={() => openOverlap('Liked together', match.likedOverlap.movies)}
      />
      <CategoryBox
        title="Watched together"
        count={match.watchedOverlap.count}
        onPress={() => openOverlap('Watched together', match.watchedOverlap.movies)}
      />

      <Pressable
        style={styles.button}
        onPress={() =>
          router.push({ pathname: '/chat/[otherUserId]', params: { otherUserId: String(match.user2Id) } })
        }>
        <ThemedText style={styles.buttonText}>Message</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
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
  avatar: { alignSelf: 'center', marginBottom: Spacing.two },
  name: { textAlign: 'center' },
  username: { textAlign: 'center', marginTop: -Spacing.one },
  score: { textAlign: 'center', marginTop: Spacing.four },
  subtitle: { textAlign: 'center', marginTop: -Spacing.two },
  error: { color: '#d33', textAlign: 'center' },
  lockedText: { textAlign: 'center' },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { marginBottom: Spacing.one },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  button: {
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
