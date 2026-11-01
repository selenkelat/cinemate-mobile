import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { subscriptionApi } from '@/api/subscription';
import { useAuth } from '@/auth/AuthContext';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DESTRUCTIVE = '#d33';

// The store's own subscription page — Apple doesn't let a developer cancel a user's
// subscription, so the user has to do it there (and Apple requires telling them so).
const MANAGE_SUBSCRIPTION_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // null = still checking. If the check fails, assume premium: showing the subscription step
  // to a free user is harmless, skipping it for a paying one isn't.
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [cancelledConfirmed, setCancelledConfirmed] = useState(false);

  useEffect(() => {
    subscriptionApi
      .get()
      .then((s) => setIsPremium(s.isPremium))
      .catch(() => setIsPremium(true));
  }, []);

  if (isPremium === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  const canDelete = password.length > 0 && (!isPremium || cancelledConfirmed) && !isDeleting;

  const runDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      // On success AuthContext signs out locally and the (app) layout redirects to login.
      await deleteAccount(password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setError('Incorrect password.');
      else if (err instanceof ApiError && err.status === 429) setError('Too many attempts. Try again in a few minutes.');
      else setError("Couldn't delete your account. Check your connection and try again.");
      setIsDeleting(false);
    }
  };

  const onDelete = () =>
    Alert.alert('Delete account?', 'This permanently deletes your account and everything in it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: runDelete },
    ]);

  return (
    <ThemedView style={styles.screen}>
      <ScreenHeader title="Delete account" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText>
          This permanently deletes your profile, imported films, favorites, chats (including the other
          person&apos;s messages) and shared lists. This can&apos;t be undone.
        </ThemedText>

        {isPremium && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">You have an active Premium subscription</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Deleting your account ends Premium immediately, but your App Store / Google Play billing
              continues until you cancel it there.
            </ThemedText>
            <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(MANAGE_SUBSCRIPTION_URL)}>
              <ThemedText type="linkPrimary">Manage subscription</ThemedText>
            </Pressable>
            <Pressable style={styles.checkRow} onPress={() => setCancelledConfirmed((v) => !v)}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: cancelledConfirmed ? AccentColor : theme.textSecondary },
                  cancelledConfirmed && { backgroundColor: AccentColor },
                ]}>
                {cancelledConfirmed && <ThemedText style={styles.checkmark}>✓</ThemedText>}
              </View>
              <ThemedText type="small" style={styles.checkLabel}>
                I&apos;ve cancelled my subscription
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Password"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
        />
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable
          style={[styles.deleteButton, { opacity: canDelete ? 1 : 0.4 }]}
          disabled={!canDelete}
          onPress={onDelete}>
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.deleteButtonText}>Delete my account</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.four },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  secondaryButton: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 14, lineHeight: 18 },
  checkLabel: { flex: 1 },
  input: { borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  error: { color: DESTRUCTIVE },
  deleteButton: { backgroundColor: DESTRUCTIVE, borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: '600' },
});
