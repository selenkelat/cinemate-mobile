import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Placeholder — the real chat screen (conversation list, messaging, block/unblock, read
// receipts) is the next slice. The route stays "/chat"; only this file's content changes then.
export default function ChatScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Chat
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.hint}>
        Coming soon.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.two },
  title: { textAlign: 'center' },
  hint: { textAlign: 'center' },
});
