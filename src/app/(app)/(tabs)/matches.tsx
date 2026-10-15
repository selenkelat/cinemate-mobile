import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { matchesApi, type CandidatesResult, type MatchCandidateDto } from '@/api/matches';
import { Avatar } from '@/components/avatar';
import { PremiumCta, showPremiumComingSoon } from '@/components/premium-cta';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Card-per-candidate, full screen, swipe up for the next one. There's no "like"/"reject" here —
// the backend has no such concept (scores are computed automatically, not a mutual opt-in), so
// swiping is pure navigation through an already-ranked list, nothing gets written anywhere.
type DeckItem = { type: 'candidate'; candidate: MatchCandidateDto } | { type: 'end' };

// 50 mirrors the backend's default Chat:MinChatScore — the "no filter" choice, sent as no
// minScore param at all. If that backend setting is ever raised, the lower chips here would
// start returning 400 and should be updated to match.
const DEFAULT_MIN_SCORE = 50;
const FILTER_OPTIONS = [50, 60, 70, 80, 90];

export default function MatchesScreen() {
  const theme = useTheme();
  const [result, setResult] = useState<CandidatesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  // Screen state only: survives tab switches (tab screens stay mounted), resets to 50 when the
  // app restarts — persisting it isn't worth a new storage dependency.
  const [minScore, setMinScore] = useState(DEFAULT_MIN_SCORE);

  const load = useCallback(async (score: number) => {
    setIsLoading(true);
    setError(null);
    try {
      setResult(await matchesApi.getCandidates(score > DEFAULT_MIN_SCORE ? score : undefined));
    } catch (err) {
      // A filtered request 403s if Premium lapsed mid-session — drop back to the default
      // list (this setter re-triggers the load effect) rather than leaving the user stuck.
      if (err instanceof ApiError && err.status === 403 && score > DEFAULT_MIN_SCORE) {
        setMinScore(DEFAULT_MIN_SCORE);
        return;
      }
      console.error('Load candidates failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(minScore);
  }, [load, minScore]);

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error}</ThemedText>
        <Pressable style={styles.button} onPress={() => load(minScore)}>
          <ThemedText style={styles.buttonText}>Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // Shown whenever premium status is known — including while a new filter loads and when the
  // filter leaves nobody, so the user can always step back down.
  const showFilter = result !== null && result.isPremium !== null;

  return (
    <View style={styles.screen}>
      {showFilter && (
        <FilterRow selected={minScore} isPremium={result.isPremium === true} onSelect={setMinScore} />
      )}
      <View style={styles.deckContainer} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
        {result === null || isLoading ? (
          <ThemedView style={styles.centered}>
            <ActivityIndicator color={theme.text} />
          </ThemedView>
        ) : result.candidates.length === 0 ? (
          <ThemedView style={styles.centered}>
            <ThemedText themeColor="textSecondary" style={styles.hint}>
              {minScore > DEFAULT_MIN_SCORE
                ? `No matches at ${minScore}%+ yet. Try a lower filter.`
                : 'No matches meet the chat threshold yet.'}
            </ThemedText>
          </ThemedView>
        ) : (
          containerHeight > 0 && <Deck result={result} height={containerHeight} deckKey={minScore} />
        )}
      </View>
    </View>
  );
}

function Deck({ result, height, deckKey }: { result: CandidatesResult; height: number; deckKey: number }) {
  const { candidates, isPremium, totalCount } = result;
  const deckData: DeckItem[] = [...candidates.map((candidate) => ({ type: 'candidate' as const, candidate })), { type: 'end' as const }];

  return (
    // Keyed by the active filter so changing it starts the deck back at the first card.
    <FlatList
      key={deckKey}
      data={deckData}
      keyExtractor={(item) => (item.type === 'candidate' ? String(item.candidate.userId) : 'end')}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={height}
      getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
      renderItem={({ item }) =>
        item.type === 'candidate' ? (
          <CandidateCard candidate={item.candidate} height={height} />
        ) : (
          <EndCard height={height} isPremium={isPremium} shown={candidates.length} total={totalCount} />
        )
      }
    />
  );
}

function FilterRow({
  selected,
  isPremium,
  onSelect,
}: {
  selected: number;
  isPremium: boolean;
  onSelect: (score: number) => void;
}) {
  const theme = useTheme();
  // Tab screens have no header, so without the inset the row sits under the status bar/notch.
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.filterRow, { paddingTop: insets.top + Spacing.two }]}>
      <ThemedText type="small" themeColor="textSecondary">
        Min match
      </ThemedText>
      {FILTER_OPTIONS.map((score) => {
        // Free users can see the options but only the default is usable — tapping the others
        // shows the same "Premium is coming soon" message as the Premium CTA.
        const isLocked = !isPremium && score > DEFAULT_MIN_SCORE;
        const isSelected = score === selected;
        return (
          <Pressable
            key={score}
            onPress={() => (isLocked ? showPremiumComingSoon() : onSelect(score))}
            style={[
              styles.filterChip,
              { backgroundColor: isSelected ? AccentColor : theme.backgroundElement, opacity: isLocked ? 0.45 : 1 },
            ]}>
            <ThemedText type="small" style={isSelected ? styles.filterChipTextSelected : undefined}>
              {score}%
            </ThemedText>
          </Pressable>
        );
      })}
      {!isPremium && (
        <ThemedText type="smallBold" style={styles.premiumTag}>
          Premium
        </ThemedText>
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

function EndCard({
  height,
  isPremium,
  shown,
  total,
}: {
  height: number;
  isPremium: boolean | null;
  shown: number;
  total: number | null;
}) {
  // Only when the backend explicitly says "free" and that more exist than were shown — a missing
  // header (older backend) or a premium caller falls back to the original copy. "Every day"
  // deliberately names no time — the backend's day boundary is UTC, i.e. 03:00 in Istanbul,
  // not local midnight.
  const isCapped = isPremium === false && total !== null && total > shown;

  if (!isCapped) {
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

  return (
    <ThemedView style={[styles.card, { height }]}>
      <ThemedText type="subtitle" style={styles.name}>
        That&apos;s today&apos;s {shown} of {total}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.hint}>
        New free picks every day.
      </ThemedText>
      <PremiumCta description={`See all ${total} of your matches, every day.`} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  deckContainer: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterChip: { borderRadius: Spacing.four, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  filterChipTextSelected: { color: '#fff' },
  premiumTag: { color: AccentColor, marginLeft: Spacing.one },
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
