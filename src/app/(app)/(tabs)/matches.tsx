import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, type ViewToken } from 'react-native';

import { ApiError } from '@/api/client';
import { matchesApi, type CandidatesResult, type MatchCandidateDto } from '@/api/matches';
import { PremiumCta, showPremiumComingSoon } from '@/components/premium-cta';
import { ProfileCard } from '@/components/profile-card';
import { ScreenHeader } from '@/components/screen-header';
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
  // Index of the card currently on screen, for the "2 of 5 today" counter; null on the end card.
  const [visibleIndex, setVisibleIndex] = useState<number | null>(0);

  const load = useCallback(async (score: number) => {
    setIsLoading(true);
    setError(null);
    try {
      setResult(await matchesApi.getCandidates(score > DEFAULT_MIN_SCORE ? score : undefined));
      setVisibleIndex(0);
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
  const count = result && !isLoading ? result.candidates.length : 0;
  const counter =
    count > 0 && visibleIndex !== null
      ? `${visibleIndex + 1} of ${count}${result?.isPremium === false ? ' today' : ''}`
      : null;

  return (
    <ThemedView style={styles.screen}>
      <ScreenHeader
        title="Matches"
        style={styles.header}
        right={
          counter && (
            <ThemedText type="small" themeColor="textSecondary">
              {counter}
            </ThemedText>
          )
        }
      />
      {showFilter && (
        <FilterRow selected={minScore} isPremium={result.isPremium === true} onSelect={setMinScore} />
      )}
      <View style={styles.deckContainer} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
        {result === null || isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.text} />
          </View>
        ) : result.candidates.length === 0 ? (
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary" style={styles.hint}>
              {minScore > DEFAULT_MIN_SCORE
                ? `No matches at ${minScore}%+ yet. Try a lower filter.`
                : 'No matches meet the chat threshold yet.'}
            </ThemedText>
          </View>
        ) : (
          containerHeight > 0 && (
            <Deck result={result} height={containerHeight} deckKey={minScore} onVisibleIndexChange={setVisibleIndex} />
          )
        )}
      </View>
    </ThemedView>
  );
}

function Deck({
  result,
  height,
  deckKey,
  onVisibleIndexChange,
}: {
  result: CandidatesResult;
  height: number;
  deckKey: number;
  onVisibleIndexChange: (index: number | null) => void;
}) {
  const { candidates, isPremium, totalCount } = result;
  const deckData: DeckItem[] = [...candidates.map((candidate) => ({ type: 'candidate' as const, candidate })), { type: 'end' as const }];

  // FlatList requires these two to keep the same identity across renders (it throws if
  // onViewableItemsChanged changes), hence refs rather than inline values.
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<DeckItem>[] }) => {
    const first = viewableItems[0];
    if (!first) return;
    onVisibleIndexChange(first.item.type === 'candidate' ? first.index : null);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

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
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
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

  return (
    <View style={styles.filterRow}>
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
  const openProfile = () => router.push({ pathname: '/match/[userId]', params: { userId: String(candidate.userId) } });
  const openChat = () =>
    router.push({ pathname: '/chat/[otherUserId]', params: { otherUserId: String(candidate.userId) } });

  return (
    <View style={[styles.page, { height }]}>
      <ProfileCard
        fill
        avatarUrl={candidate.avatarUrl}
        displayName={candidate.displayName}
        username={candidate.username}
        stat={{ value: `${Math.round(candidate.overallScore)}%`, label: 'Taste match' }}
        favoritesLabel="Their favorites"
        favorites={candidate.favoriteMovies}
        commonCount={candidate.watchedOverlapCount}
        genres={candidate.topGenres}
        action={{ label: 'Message', onPress: openChat }}
        onPress={openProfile}
      />
    </View>
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
      <View style={[styles.endCard, { height }]}>
        <ThemedText type="subtitle" style={styles.endTitle}>
          You&apos;ve seen everyone
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.hint}>
          Check back later for new matches.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.endCard, { height }]}>
      <ThemedText type="subtitle" style={styles.endTitle}>
        That&apos;s today&apos;s {shown} of {total}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.hint}>
        New free picks every day.
      </ThemedText>
      <PremiumCta description={`See all ${total} of your matches, every day.`} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.four },
  deckContainer: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  filterChip: { borderRadius: Spacing.four, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  filterChipTextSelected: { color: '#fff' },
  premiumTag: { color: AccentColor, marginLeft: Spacing.one },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  hint: { textAlign: 'center' },
  error: { color: '#d33', textAlign: 'center' },
  page: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  endCard: { justifyContent: 'center', alignItems: 'center', padding: Spacing.five, gap: Spacing.two },
  endTitle: { textAlign: 'center' },
  button: {
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
