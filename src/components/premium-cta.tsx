import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';

// Shared upsell block for anywhere the free-tier cap shows (Matches deck end card, locked match
// detail). There's no paywall yet (RevenueCat purchase flow is Phase 2), so the button shows an
// honest "coming soon" instead of being a dead tap — swap onPress for paywall navigation then.
export function PremiumCta({ description }: { description: string }) {
  const onPress = () => {
    Alert.alert('Premium is coming soon', "Subscriptions aren't available yet — we'll let you know when they are.");
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.heading}>Go Premium</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.description}>
        {description}
      </ThemedText>
      <Pressable style={styles.button} onPress={onPress}>
        <ThemedText style={styles.buttonText}>Get Premium</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderColor: AccentColor,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  heading: { color: AccentColor, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  description: { textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
