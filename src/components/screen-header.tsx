import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AccentColor, Spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  title?: string;
  // Shown only when there's somewhere to go back to — e.g. upload.tsx is both a pushed screen
  // (from Settings) and an onboarding landing (no history), and only the former gets a button.
  showBack?: boolean;
  // Custom middle content instead of a plain title (the chat screen's avatar + name strip).
  children?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Every screen in this app runs with headerShown: false, so this is what keeps the top row out
// from under the status bar/notch (it was untappable there — hit on device twice) and gives
// pushed screens a visible way back on iOS, where the swipe gesture is the only other one.
// No horizontal padding of its own: it sits inside each screen's own padded container.
export function ScreenHeader({ title, showBack = false, children, right, style }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const canGoBack = showBack && router.canGoBack();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + Spacing.two }, style]}>
      {canGoBack && (
        <Pressable onPress={() => router.back()} hitSlop={Spacing.three} style={styles.back}>
          <ThemedText style={styles.backText}>‹</ThemedText>
        </Pressable>
      )}
      <View style={styles.center}>
        {children ??
          (title ? (
            <ThemedText style={styles.title} numberOfLines={1}>
              {title}
            </ThemedText>
          ) : null)}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.two },
  back: { paddingRight: Spacing.one },
  backText: { color: AccentColor, fontSize: 34, lineHeight: 36, fontWeight: '600' },
  center: { flex: 1, minHeight: 36, justifyContent: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
});
