import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { matchesApi, type MatchResultDto, type WatchRecommendationsDto } from '@/api/matches';
import { CategoryBox } from '@/components/category-box';
import { PremiumCta, showPremiumComingSoon } from '@/components/premium-cta';
import { ProfileCard } from '@/components/profile-card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function MatchDetailScreen() {
  // from=chat: opened from that person's chat strip (see onMessage below).
  const { userId, from } = useLocalSearchParams<{ userId: string; from?: string }>();
  const theme = useTheme();
  const [match, setMatch] = useState<MatchResultDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 403 = a free caller who was never shown this person in a daily pick and has no chat with them
  // (previously shown people and chat partners stay open). Retrying can't change that, so it gets
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

  // Premium "watch next" lists, fetched separately once the match itself has loaded so the rest
  // of the screen never waits on them. null = loading or failed (section hidden); 'locked' = 403
  // for a free caller (section shown locked).
  const [recommendations, setRecommendations] = useState<WatchRecommendationsDto | 'locked' | null>(null);

  useEffect(() => {
    if (!match) return;
    let cancelled = false;
    setRecommendations(null);
    matchesApi
      .getRecommendations(match.user2Id)
      .then((result) => {
        if (!cancelled) setRecommendations(result);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setRecommendations('locked');
          return;
        }
        console.error('Load watch recommendations failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [match]);

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
          {/* Anyone from an earlier day's picks, or a chat partner, stays open — so only never-shown people land here. */}
          You haven&apos;t been shown this match in your free picks yet.
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

  // Opened from that person's chat strip: going "to" the chat is just going back. Pushing a
  // second chat screen would open a second socket, and the backend's one-connection-per-user
  // rule would close the first one underneath it.
  const onMessage = () =>
    from === 'chat'
      ? router.back()
      : router.push({ pathname: '/chat/[otherUserId]', params: { otherUserId: String(match.user2Id) } });

  return (
    <ThemedView style={styles.screen}>
      <ScreenHeader showBack style={styles.header} />
      <ScrollView contentContainerStyle={styles.container}>
      <ProfileCard
        avatarUrl={match.avatarUrl}
        displayName={match.displayName}
        username={match.username}
        stat={{ value: `${Math.round(match.overallScore)}%`, label: 'Taste match' }}
        favoritesLabel="Their favorites"
        favorites={match.otherFavoriteMovies}
        commonCount={match.watchedOverlap.count}
        genres={match.otherTopGenres ?? []}
        action={{ label: 'Message', onPress: onMessage }}
      />

      <ThemedView type="backgroundElement" style={styles.card}>
        <StatRow label="Genre similarity" value={`${match.genreSimilarity}%`} />
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

      {recommendations !== null && (
        <>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Watch next
          </ThemedText>
          {recommendations === 'locked' ? (
            <>
              <CategoryBox title={`${match.displayName}'s picks for you`} count={0} locked onPress={showPremiumComingSoon} />
              <CategoryBox title={`Your picks for ${match.displayName}`} count={0} locked onPress={showPremiumComingSoon} />
            </>
          ) : (
            <>
              <CategoryBox
                title={`${match.displayName}'s picks for you`}
                count={recommendations.forYou.count}
                onPress={() => openOverlap(`${match.displayName}'s picks for you`, recommendations.forYou.movies)}
              />
              <CategoryBox
                title={`Your picks for ${match.displayName}`}
                count={recommendations.forThem.count}
                onPress={() => openOverlap(`Your picks for ${match.displayName}`, recommendations.forThem.movies)}
              />
            </>
          )}
        </>
      )}
      </ScrollView>
    </ThemedView>
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
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.four },
  container: { flexGrow: 1, paddingHorizontal: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  name: { textAlign: 'center' },
  error: { color: '#d33', textAlign: 'center' },
  lockedText: { textAlign: 'center' },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  sectionTitle: { marginTop: Spacing.two, marginBottom: -Spacing.one },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  button: {
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
