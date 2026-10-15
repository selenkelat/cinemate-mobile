import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Settings" showBack />

      <View style={styles.content}>
        <Pressable style={styles.button} onPress={() => router.push('/favorites')}>
          <ThemedText style={styles.buttonText}>Edit favorites</ThemedText>
        </Pressable>

        <Pressable style={styles.button} onPress={() => router.push('/upload')}>
          <ThemedText style={styles.buttonText}>Upload new export</ThemedText>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => logout()}>
          <ThemedText type="linkPrimary">Log out</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.four },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
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
