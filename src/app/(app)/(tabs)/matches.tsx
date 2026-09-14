import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { matchesApi, type MatchCandidateDto } from '@/api/matches';
import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Card-per-candidate, full screen, swipe up for the next one. There's no "like"/"reject" here —
// the backend has no such concept (scores are computed automatically, not a mutual opt-in), so
// swiping is pure navigation through an already-ranked list, nothing gets written anywhere.
type DeckItem = { type: 'candidate'; candidate: MatchCandidateDto } | { type: 'end' };

export default function MatchesScreen() {
  const theme = useTheme();
  const [candidates, setCandidates] = useState<MatchCandidateDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await matchesApi.getCandidates();
      setCandidates(result);
    } catch (err) {
      console.error('Load candidates failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  if (candidates === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (candidates.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary" style={styles.hint}>
          No matches meet the chat threshold yet.
        </ThemedText>
      </ThemedView>
    );
  }

  const deckData: DeckItem[] = [...candidates.map((candidate) => ({ type: 'candidate' as const, candidate })), { type: 'end' as const }];

  return (
    <View style={styles.deckContainer} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {containerHeight > 0 && (
        <FlatList
          data={deckData}
          keyExtractor={(item) => (item.type === 'candidate' ? String(item.candidate.userId) : 'end')}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={containerHeight}
          getItemLayout={(_, index) => ({ length: containerHeight, offset: containerHeight * index, index })}
          renderItem={({ item }) =>
            item.type === 'candidate' ? (
              <CandidateCard candidate={item.candidate} height={containerHeight} />
            ) : (
              <EndCard height={containerHeight} />
            )
          }
        />
      )}
    </View>
  );
}

function CandidateCard({ candidate, height }: { candidate: MatchCandidateDto; height: number }) {
  const theme = useTheme();

  const onMessage = () => {
    router.push({ pathname: '/chat/[otherUserId]', params: { otherUserId: String(candidate.userId) } });
  };

  return (
    <Pressable
      style={[styles.card, { height }]}
      onPress={() => router.push({ pathname: '/match/[userId]', params: { userId: String(candidate.userId) } })}>
      <Avatar avatarUrl={candidate.avatarUrl} displayName={candidate.displayName} style={styles.avatar} />

      <ThemedText type="subtitle" style={styles.name}>
        {candidate.displayName}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.username}>
        @{candidate.username}
      </ThemedText>

      <ThemedText type="title" style={styles.score}>
        {Math.round(candidate.overallScore)}%
      </ThemedText>

      {candidate.favoriteMovies.length > 0 && (
        <ThemedView type="backgroundElement" style={styles.favoritesCard}>
          <ThemedText type="smallBold" style={styles.favoritesTitle}>
            Favorites
          </ThemedText>
          <View style={styles.posterRow}>
            {candidate.favoriteMovies.map((favorite) =>
              favorite.posterUrl ? (
                <Image key={favorite.movieId} source={{ uri: favorite.posterUrl }} style={styles.poster} contentFit="cover" />
              ) : (
                <View
                  key={favorite.movieId}
                  style={[styles.poster, { backgroundColor: theme.backgroundSelected }]}
                />
              ),
            )}
          </View>
        </ThemedView>
      )}

      <ThemedText themeColor="textSecondary" style={styles.overlapText}>
        {candidate.watchedOverlapCount} films in common
      </ThemedText>

      {candidate.topGenres.length > 0 && (
        <View style={styles.chipRow}>
          {candidate.topGenres.map((genre) => (
            <View key={genre} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{genre}</ThemedText>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.messageButton} onPress={onMessage}>
        <ThemedText style={styles.messageButtonText}>Message</ThemedText>
      </Pressable>
    </Pressable>
  );
}

function EndCard({ height }: { height: number }) {
  return (
    <ThemedView style={[styles.card, { height }]}>
      <ThemedText type="subtitle" style={styles.name}>
        You&apos;ve seen everyone
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.hint}>
        Check back later for new matches.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  deckContainer: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  hint: { textAlign: 'center' },
  error: { color: '#d33', textAlign: 'center' },
  card: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
  },
  avatar: { marginBottom: Spacing.two },
  name: { textAlign: 'center' },
  username: { textAlign: 'center', marginTop: -Spacing.one },
  score: { color: AccentColor, marginTop: Spacing.three },
  favoritesCard: { borderRadius: Spacing.two, padding: Spacing.three, marginTop: Spacing.two, alignItems: 'center' },
  favoritesTitle: { marginBottom: Spacing.two },
  posterRow: { flexDirection: 'row', gap: Spacing.two },
  poster: { width: 40, height: 60, borderRadius: Spacing.half },
  overlapText: { marginTop: Spacing.one },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.one, marginTop: Spacing.one },
  chip: { borderRadius: Spacing.four, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  messageButton: {
    marginTop: Spacing.four,
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  messageButtonText: { color: '#fff', fontWeight: '600' },
  button: {
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
