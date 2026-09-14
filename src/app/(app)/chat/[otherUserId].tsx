import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { chatApi, type ConversationSummaryDto, type MessageDto } from '@/api/chat';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useChatSocket } from '@/chat/useChatSocket';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PAGE_SIZE = 50;

type LoadState = 'loading' | 'error' | 'ready';

export default function ConversationScreen() {
  const { otherUserId: otherUserIdParam } = useLocalSearchParams<{ otherUserId: string }>();
  const otherUserId = Number(otherUserIdParam);
  const { user } = useAuth();
  const theme = useTheme();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  // null = no conversation exists yet (brand new, reached via a match's "Message" button).
  const [summary, setSummary] = useState<ConversationSummaryDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]); // newest-first, matches the inverted list
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [input, setInput] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const markedReadRef = useRef(false);

  const isBlocked = summary?.isBlocked ?? false;
  const blockedByMe = summary?.blockedByMe ?? false;

  const onIncomingMessage = useCallback((message: MessageDto) => {
    setMessages((prev) => [message, ...prev]);
  }, []);

  const {
    status: wsStatus,
    closeReason,
    send,
    reconnect,
  } = useChatSocket(otherUserId, loadState === 'ready' && !isBlocked, onIncomingMessage);

  const load = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const [conversations, history] = await Promise.all([
        chatApi.getConversations(),
        chatApi.getMessages(otherUserId, undefined, PAGE_SIZE).catch((err) => {
          // No conversation yet — a real state, not a failure (see ChatService.GetMessagesAsync).
          if (err instanceof ApiError && err.status === 404) return [] as MessageDto[];
          throw err;
        }),
      ]);
      setSummary(conversations.find((c) => c.otherUserId === otherUserId) ?? null);
      setMessages([...history].reverse());
      setHasMoreOlder(history.length === PAGE_SIZE);
      setLoadState('ready');
    } catch (err) {
      console.error('Load conversation failed:', err);
      setLoadError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
      setLoadState('error');
    }
  }, [otherUserId]);

  useEffect(() => {
    load();
  }, [load]);

  // Fires once per screen visit, right after history loads — "opened the thread" semantics,
  // matching the backend's per-conversation high-water mark rather than tracking per message.
  useEffect(() => {
    if (loadState === 'ready' && !markedReadRef.current) {
      markedReadRef.current = true;
      chatApi.markRead(otherUserId).catch((err) => console.error('Mark read failed:', err));
    }
  }, [loadState, otherUserId]);

  const loadOlder = useCallback(async () => {
    if (isLoadingOlder || !hasMoreOlder || messages.length === 0) return;
    setIsLoadingOlder(true);
    try {
      const oldestId = messages[messages.length - 1].id;
      const page = await chatApi.getMessages(otherUserId, oldestId, PAGE_SIZE);
      setMessages((prev) => [...prev, ...[...page].reverse()]);
      setHasMoreOlder(page.length === PAGE_SIZE);
    } catch (err) {
      console.error('Load older messages failed:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMoreOlder, messages, otherUserId]);

  const onSend = () => {
    const body = input.trim();
    if (!body) return;
    send(body);
    setInput('');
  };

  const onBlock = async () => {
    setIsBlocking(true);
    try {
      const result = await chatApi.block(otherUserId);
      setSummary((prev) => (prev ? { ...prev, ...result } : prev));
    } catch (err) {
      console.error('Block failed:', err);
    } finally {
      setIsBlocking(false);
    }
  };

  const onUnblock = async () => {
    setIsUnblocking(true);
    try {
      const result = await chatApi.unblock(otherUserId);
      setSummary((prev) => (prev ? { ...prev, ...result } : prev));
    } catch (err) {
      console.error('Unblock failed:', err);
    } finally {
      setIsUnblocking(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (loadState === 'error') {
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Spacing.six}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.headerTitle}>
            {summary?.otherDisplayName ?? `User ${otherUserId}`}
          </ThemedText>
          {isBlocked && blockedByMe ? (
            <Pressable onPress={onUnblock} disabled={isUnblocking}>
              <ThemedText type="linkPrimary">{isUnblocking ? 'Unblocking…' : 'Unblock'}</ThemedText>
            </Pressable>
          ) : !isBlocked ? (
            <Pressable onPress={onBlock} disabled={isBlocking}>
              <ThemedText type="linkPrimary">{isBlocking ? 'Blocking…' : 'Block'}</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.id)}
          inverted
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingOlder ? <ActivityIndicator color={theme.text} style={styles.olderSpinner} /> : null
          }
          renderItem={({ item }) => <MessageBubble message={item} isMine={item.senderId === user!.id} />}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.hint}>
              {isBlocked ? 'No messages yet.' : 'Say hello — this is the start of your conversation.'}
            </ThemedText>
          }
        />

        {isBlocked ? (
          <ThemedText themeColor="textSecondary" style={styles.blockedNotice}>
            {blockedByMe ? 'You blocked this conversation.' : 'The other person has blocked this conversation.'}
          </ThemedText>
        ) : wsStatus === 'closed' ? (
          <View style={styles.reconnectRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.reconnectText}>
              {closeReason
                ? `Disconnected: ${closeReason}`
                : "Couldn't start this conversation. You may need a higher match score, or this user isn't reachable right now."}
            </ThemedText>
            <Pressable onPress={reconnect}>
              <ThemedText type="linkPrimary">Reconnect</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder={wsStatus === 'open' ? 'Message' : 'Connecting…'}
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <Pressable
              style={[styles.sendButton, (wsStatus !== 'open' || !input.trim()) && styles.sendButtonDisabled]}
              onPress={onSend}
              disabled={wsStatus !== 'open' || !input.trim()}>
              <ThemedText style={styles.sendButtonText}>Send</ThemedText>
            </Pressable>
          </View>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, isMine }: { message: MessageDto; isMine: boolean }) {
  const theme = useTheme();

  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <View style={[styles.bubble, { backgroundColor: isMine ? '#208AEF' : theme.backgroundElement }]}>
        <ThemedText style={isMine ? styles.bubbleTextMine : undefined}>{message.body}</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingTop: Spacing.four },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  error: { color: '#d33', textAlign: 'center' },
  hint: { textAlign: 'center', padding: Spacing.four },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerTitle: { flex: 1, marginRight: Spacing.two },
  list: { flex: 1 },
  listContent: { padding: Spacing.four, gap: Spacing.two },
  olderSpinner: { marginVertical: Spacing.three },
  bubbleRow: { maxWidth: '80%', gap: Spacing.half },
  bubbleRowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleRowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  bubbleTextMine: { color: '#fff' },
  blockedNotice: { textAlign: 'center', padding: Spacing.four },
  reconnectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  reconnectText: { flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: { flex: 1, borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16, maxHeight: 120 },
  sendButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#fff', fontWeight: '600' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
