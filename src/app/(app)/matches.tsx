import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { matchesApi, type MatchCandidateDto } from '@/api/matches';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function MatchesScreen() {
  const theme = useTheme();
  const [candidates, setCandidates] = useState<MatchCandidateDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await matchesApi.getCandidates();
      setCandidates(result);
    } catch (err) {
      console.error('Load candidates failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Matches
      </ThemedText>

      <FlatList
        data={candidates}
        keyExtractor={(item) => String(item.userId)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { backgroundColor: theme.backgroundElement }]}
            onPress={() => router.push({ pathname: '/match/[userId]', params: { userId: String(item.userId) } })}>
            <View style={styles.rowInfo}>
              <ThemedText type="smallBold">{item.displayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                @{item.username} · {item.watchedOverlapCount} films in common
              </ThemedText>
            </View>
            <ThemedText type="title" style={styles.score}>
              {Math.round(item.overallScore)}%
            </ThemedText>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.hint}>
            No one else has imported their films yet.
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
  hint: { textAlign: 'center' },
  error: { color: '#d33', textAlign: 'center' },
  listContent: { paddingBottom: Spacing.six },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  rowInfo: { flex: 1, gap: Spacing.half },
  score: { fontSize: 28, lineHeight: 32 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
