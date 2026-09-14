import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Settings
      </ThemedText>

      <Pressable style={styles.button} onPress={() => router.push('/favorites')}>
        <ThemedText style={styles.buttonText}>Edit favorites</ThemedText>
      </Pressable>

      <Pressable style={styles.button} onPress={() => router.push('/upload')}>
        <ThemedText style={styles.buttonText}>Upload new export</ThemedText>
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
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  secondaryButton: { padding: Spacing.two },
  buttonText: { color: '#fff', fontWeight: '600' },
});
