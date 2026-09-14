import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { FavoriteMovieDto } from '@/api/profile';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A single ranked favorite: small poster + "1. Title". Shared between Profile's own favorites
// list and the match-detail screen's "their favorites" list — same shape (FavoriteMovieDto),
// same visual treatment.
export function FavoriteMovieRow({ favorite }: { favorite: FavoriteMovieDto }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {favorite.posterUrl ? (
        <Image source={{ uri: favorite.posterUrl }} style={styles.poster} contentFit="cover" />
      ) : (
        <View style={[styles.poster, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <ThemedText style={styles.title}>
        {favorite.rank}. {favorite.title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  poster: { width: 46, height: 69, borderRadius: Spacing.half },
  title: { flex: 1 },
});
