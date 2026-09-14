import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { favoritesApi } from '@/api/favorites';
import { moviesApi, type WatchedMovieDto } from '@/api/movies';
import { profileApi } from '@/api/profile';
import { useAuth } from '@/auth/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_FAVORITES = 4;

export default function FavoritesScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovieDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [watched, profile] = await Promise.all([moviesApi.getWatched(), profileApi.get(user!.id)]);
      setWatchedMovies(watched);
      setSelectedIds(profile.favoriteMovies.sort((a, b) => a.rank - b.rank).map((f) => f.movieId));
    } catch (err) {
      console.error('Load favorites picker failed:', err);
      setLoadError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredMovies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return watchedMovies;
    return watchedMovies.filter((m) => m.title.toLowerCase().includes(query));
  }, [watchedMovies, search]);

  const toggle = (movieId: number) => {
    setSelectedIds((current) => {
      if (current.includes(movieId)) return current.filter((id) => id !== movieId);
      if (current.length >= MAX_FAVORITES) return current;
      return [...current, movieId];
    });
  };

  const onSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await favoritesApi.set(selectedIds);
      router.replace('/profile');
    } catch (err) {
      console.error('Save favorites failed:', err);
      if (err instanceof ApiError && err.status === 422) {
        // Backend's 422 body is a JSON object ({ message, invalidMovieIds }), not the plain
        // string client.ts unwraps — showing err.message here would leak raw JSON, so this
        // status gets its own generic copy instead.
        setSaveError('Some of your selected movies are no longer available. Pull to refresh and try again.');
      } else if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (loadError) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{loadError}</ThemedText>
        <Pressable style={styles.button} onPress={load}>
          <ThemedText style={styles.buttonText}>Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Choose favorites
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.hint}>
        Pick up to {MAX_FAVORITES} from your watched films. Uploading a new export resets this.
      </ThemedText>

      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        placeholder="Search your watched films"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        value={search}
        onChangeText={setSearch}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.counter}>
        {selectedIds.length}/{MAX_FAVORITES} selected
      </ThemedText>

      <FlatList
        data={filteredMovies}
        keyExtractor={(item) => String(item.movieId)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.movieId);
          const isDisabled = !isSelected && selectedIds.length >= MAX_FAVORITES;
          return (
            <Pressable
              onPress={() => toggle(item.movieId)}
              disabled={isDisabled}
              style={[
                styles.row,
                { backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement },
                isDisabled && styles.rowDisabled,
              ]}>
              <ThemedText numberOfLines={1} style={styles.rowText}>
                {item.title}
                {item.releaseYear ? ` (${item.releaseYear})` : ''}
              </ThemedText>
              {isSelected && <ThemedText type="smallBold">✓</ThemedText>}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.one }} />}
        ListEmptyComponent={<ThemedText themeColor="textSecondary">No films match your search.</ThemedText>}
      />

      {saveError ? <ThemedText style={styles.error}>{saveError}</ThemedText> : null}

      <Pressable style={[styles.button, isSaving && styles.buttonDisabled]} onPress={onSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Save favorites</ThemedText>}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.two },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center' },
  hint: { textAlign: 'center', marginBottom: Spacing.one },
  error: { color: '#d33', textAlign: 'center' },
  input: { borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  counter: { textAlign: 'center' },
  list: { flex: 1 },
  listContent: { paddingVertical: Spacing.one },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  rowDisabled: { opacity: 0.4 },
  rowText: { flex: 1, marginRight: Spacing.two },
  button: {
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
