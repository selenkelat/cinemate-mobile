import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { moviesApi } from '@/api/movies';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GridMovie {
  movieId: number;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
}

// Two ways to land here, both intentional (see plan): a match overlap list is already sitting in
// the caller's state (match/[userId].tsx just fetched it), so it's passed straight through as a
// JSON param — no second request for what's typically a small intersection. Profile's own
// watched/liked lists (hundreds of movies, never pre-fetched by profile.tsx) are fetched here,
// lazily, only when the user actually taps in.
export default function MovieListScreen() {
  const { title, movies: moviesParam, source } = useLocalSearchParams<{
    title: string;
    movies?: string;
    source?: string;
  }>();
  const theme = useTheme();
  const [movies, setMovies] = useState<GridMovie[] | null>(moviesParam ? (JSON.parse(moviesParam) as GridMovie[]) : null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (moviesParam) return;
    setError(null);
    try {
      const result = source === 'liked' ? await moviesApi.getLiked() : await moviesApi.getWatched();
      setMovies(result);
    } catch (err) {
      console.error('Load movie list failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    }
  }, [moviesParam, source]);

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

  if (movies === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.movieId)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            {item.posterUrl ? (
              <Image source={{ uri: item.posterUrl }} style={styles.poster} contentFit="cover" />
            ) : (
              <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <ThemedText type="small" numberOfLines={2} style={styles.cellTitle}>
              {item.title}
              {item.releaseYear ? ` (${item.releaseYear})` : ''}
            </ThemedText>
          </View>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.hint}>
            Nothing here yet.
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center' },
  hint: { textAlign: 'center', padding: Spacing.four },
  error: { color: '#d33', textAlign: 'center' },
  listContent: { paddingBottom: Spacing.six, gap: Spacing.three },
  row: { justifyContent: 'space-between' },
  cell: { width: '31%', gap: Spacing.half },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: Spacing.half },
  cellTitle: { textAlign: 'center' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
