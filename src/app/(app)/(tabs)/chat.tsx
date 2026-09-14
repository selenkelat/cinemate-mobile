import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { chatApi, type ConversationSummaryDto } from '@/api/chat';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ChatInboxScreen() {
  const theme = useTheme();
  const [conversations, setConversations] = useState<ConversationSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await chatApi.getConversations();
      setConversations(result);
    } catch (err) {
      console.error('Load conversations failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetches every time this tab regains focus — there's no shared/global state for unread
  // counts in this app, so "reload on focus" is the simplest way to keep them current after
  // reading a conversation or receiving a new message elsewhere.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
        Chat
      </ThemedText>

      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.otherUserId)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { backgroundColor: theme.backgroundElement }]}
            onPress={() =>
              router.push({ pathname: '/chat/[otherUserId]', params: { otherUserId: String(item.otherUserId) } })
            }>
            <View style={styles.rowInfo}>
              <ThemedText type="smallBold">{item.otherDisplayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {item.lastMessageBody ?? 'No messages yet'}
              </ThemedText>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <ThemedText type="small" style={styles.badgeText}>
                  {item.unreadCount}
                </ThemedText>
              </View>
            )}
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.hint}>
            No conversations yet — message someone from a match to start one.
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
  rowInfo: { flex: 1, gap: Spacing.half, marginRight: Spacing.two },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  badgeText: { color: '#fff', fontWeight: '700' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
