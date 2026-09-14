import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Proves the full pipeline end to end: register/login -> token stored -> session restored on
// cold start -> this screen renders. Everything past this (conversations, matching, profile)
// is a separate, later slice.
export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Welcome, {user?.displayName}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        @{user?.username}
      </ThemedText>

      <Pressable style={styles.button} onPress={() => router.push('/upload')}>
        <ThemedText style={styles.buttonText}>Upload Letterboxd export</ThemedText>
      </Pressable>

      <Pressable style={styles.button} onPress={() => router.push('/profile')}>
        <ThemedText style={styles.buttonText}>My profile</ThemedText>
      </Pressable>

      <Pressable style={styles.button} onPress={() => router.push('/matches')}>
        <ThemedText style={styles.buttonText}>Find matches</ThemedText>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => logout()}>
        <ThemedText type="linkPrimary">Log out</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center' },
  button: {
    marginTop: Spacing.four,
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  secondaryButton: { padding: Spacing.two },
  buttonText: { color: '#fff', fontWeight: '600' },
});
