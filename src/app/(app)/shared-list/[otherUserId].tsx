import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { sharedListApi, type MovieSearchResultDto, type SharedListDto } from '@/api/shared-list';
import { PremiumCta } from '@/components/premium-cta';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;

// A conversation's shared "to watch" list — open only while both participants are premium.
// No live updates: the other person's changes show up when this screen regains focus.
export default function SharedListScreen() {
  const { otherUserId: otherUserIdParam, name } = useLocalSearchParams<{ otherUserId: string; name?: string }>();
  const otherUserId = Number(otherUserIdParam);
  const otherName = name || `User ${otherUserId}`;
  const theme = useTheme();

  const [list, setList] = useState<SharedListDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSearchResultDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [busyMovieId, setBusyMovieId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setList(await sharedListApi.get(otherUserId));
    } catch (err) {
      console.error('Load shared list failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    }
  }, [otherUserId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const trimmedQuery = query.trim();
  const isSearchMode = trimmedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isSearchMode) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await sharedListApi.searchMovies(trimmedQuery);
        if (!cancelled) setResults(found);
      } catch (err) {
        if (cancelled) return;
        console.error('Movie search failed:', err);
        setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, isSearchMode]);

  // A 403 mid-session means Premium lapsed on one side or the conversation got blocked —
  // reloading shows the right locked/blocked state instead of a dead button.
  const handleWriteError = (err: unknown, action: string) => {
    console.error(`${action} failed:`, err);
    if (err instanceof ApiError && err.status === 403) {
      load();
    }
    Alert.alert(`Couldn't ${action.toLowerCase()}`, err instanceof ApiError ? err.message : 'Check your connection and try again.');
  };

  const onAdd = async (movie: MovieSearchResultDto) => {
    setBusyMovieId(movie.movieId);
    try {
      setList(await sharedListApi.add(otherUserId, movie.movieId));
      setQuery('');
    } catch (err) {
      handleWriteError(err, 'Add movie');
    } finally {
      setBusyMovieId(null);
    }
  };

  const onRemove = (movieId: number, title: string) => {
    Alert.alert('Remove from list?', `"${title}" will be removed for both of you.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusyMovieId(movieId);
          try {
            await sharedListApi.remove(otherUserId, movieId);
            setList((current) => (current ? { ...current, items: current.items.filter((i) => i.movieId !== movieId) } : current));
          } catch (err) {
            handleWriteError(err, 'Remove movie');
          } finally {
            setBusyMovieId(null);
          }
        },
      },
    ]);
  };

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

  if (list === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  const title = (
    <ThemedText type="subtitle" style={styles.title}>
      Watch list with {otherName}
    </ThemedText>
  );

  if (!list.callerIsPremium || !list.otherIsPremium) {
    return (
      <ThemedView style={styles.screen}>
        <ScreenHeader showBack style={styles.header} />
        <View style={styles.centered}>
          {title}
          {!list.callerIsPremium ? (
            <PremiumCta description={`Build a watch list together with ${otherName}. Needs Premium on both sides.`} />
          ) : (
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              {otherName} needs Premium too. Shared lists unlock when you&apos;re both on Premium.
            </ThemedText>
          )}
        </View>
      </ThemedView>
    );
  }

  const listedIds = new Set(list.items.map((i) => i.movieId));

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={`Watch list with ${otherName}`} showBack />

      {list.isBlocked ? (
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          This conversation is blocked. The list is read-only.
        </ThemedText>
      ) : (
        <TextInput
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Search for a movie to add"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
      )}

      {isSearchMode ? (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.movieId)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            isSearching ? (
              <ActivityIndicator color={theme.text} style={styles.spinner} />
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                No movies found.
              </ThemedText>
            )
          }
          renderItem={({ item }) => (
            <MovieRow posterUrl={item.posterUrl} title={item.title} releaseYear={item.releaseYear}>
              {listedIds.has(item.movieId) ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Added
                </ThemedText>
              ) : busyMovieId === item.movieId ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <Pressable style={styles.smallButton} onPress={() => onAdd(item)} disabled={busyMovieId !== null}>
                  <ThemedText type="smallBold" style={styles.buttonText}>
                    Add
                  </ThemedText>
                </Pressable>
              )}
            </MovieRow>
          )}
        />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.movieId)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              Nothing here yet. Search for a movie to add.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <MovieRow
              posterUrl={item.posterUrl}
              title={item.title}
              releaseYear={item.releaseYear}
              subtitle={item.addedByMe ? 'Added by you' : `Added by ${otherName}`}>
              {!list.isBlocked &&
                (busyMovieId === item.movieId ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <Pressable onPress={() => onRemove(item.movieId, item.title)} disabled={busyMovieId !== null}>
                    <ThemedText type="small" style={styles.removeText}>
                      Remove
                    </ThemedText>
                  </Pressable>
                ))}
            </MovieRow>
          )}
        />
      )}
    </ThemedView>
  );
}

function MovieRow({
  posterUrl,
  title,
  releaseYear,
  subtitle,
  children,
}: {
  posterUrl: string | null;
  title: string;
  releaseYear: number | null;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" />
      ) : (
        <View style={[styles.poster, { backgroundColor: theme.background }]} />
      )}
      <View style={styles.rowText}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {title}
          {releaseYear ? ` (${releaseYear})` : ''}
        </ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.four },
  container: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center' },
  centerText: { textAlign: 'center' },
  error: { color: '#d33', textAlign: 'center' },
  search: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  spinner: { marginTop: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Spacing.two, padding: Spacing.two },
  poster: { width: 46, height: 69, borderRadius: Spacing.one },
  rowText: { flex: 1, gap: Spacing.half },
  button: { backgroundColor: AccentColor, borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  smallButton: { backgroundColor: AccentColor, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  buttonText: { color: '#fff', fontWeight: '600' },
  removeText: { color: '#d33' },
});
