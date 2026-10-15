import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CategoryBoxProps {
  title: string;
  count: number;
  onPress: () => void;
  // Premium-gated category seen by a free user: the count isn't known (the backend 403s before
  // computing it), so a "Premium" label replaces the badge. onPress is the caller's upsell.
  locked?: boolean;
}

// A tappable "N of these — go look" row: bold title on the left, an accent-colored count badge
// and a chevron on the right. Used wherever a category (watched/liked, in common or personal)
// leads to a poster grid — the badge + chevron are what signal "tap me" without a new icon
// dependency (project doesn't use one).
export function CategoryBox({ title, count, onPress, locked = false }: CategoryBoxProps) {
  const theme = useTheme();

  return (
    <Pressable style={[styles.box, { backgroundColor: theme.backgroundElement }]} onPress={onPress}>
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.right}>
        {locked ? (
          <ThemedText type="smallBold" style={styles.lockedText}>
            Premium
          </ThemedText>
        ) : (
          <View style={styles.badge}>
            <ThemedText type="small" style={styles.badgeText}>
              {count}
            </ThemedText>
          </View>
        )}
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  // Longer titles ("Selen Test 2's picks for you") wrap instead of pushing the badge off-screen.
  title: { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AccentColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  badgeText: { color: '#fff', fontWeight: '700' },
  lockedText: { color: AccentColor },
});
