import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FAVORITE_SLOTS = 4;

export interface ProfileCardPoster {
  movieId: number;
  posterUrl: string | null;
}

interface ProfileCardProps {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  // The big accent number on the right — match % for someone else, films watched for yourself.
  stat: { value: string; label: string };
  favoritesLabel: string;
  favorites: ProfileCardPoster[];
  // Small link next to the favorites label (own profile: "Edit" → the favorites picker).
  favoritesAction?: { label: string; onPress: () => void };
  commonCount?: number;
  genres: string[];
  badge?: string;
  action?: { label: string; onPress: () => void };
  // Own profile: tapping the photo changes it (shows the ✎ badge, same cue as Avatar's).
  onPhotoPress?: () => void;
  // Whole-card tap (Matches deck → profile). Inner buttons still get their own taps.
  onPress?: () => void;
  // Deck mode: the card fills the height it's given and the photo absorbs the slack. Otherwise
  // the photo has a fixed height and the card sizes to its content (inside a ScrollView).
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

// The shared "big card" profile layout: photo on top, name + big stat, four favorite posters,
// films-in-common + genre chips, optional action. Used by the Matches deck, someone else's
// profile (match detail), and your own Profile tab. No gradient over the photo — that would need
// expo-linear-gradient, and this app doesn't add dependencies for looks alone.
export function ProfileCard({
  avatarUrl,
  displayName,
  username,
  stat,
  favoritesLabel,
  favorites,
  favoritesAction,
  commonCount,
  genres,
  badge,
  action,
  onPhotoPress,
  onPress,
  fill = false,
  style,
}: ProfileCardProps) {
  const theme = useTheme();
  const [photoFailed, setPhotoFailed] = useState(false);

  const slots: (ProfileCardPoster | null)[] = [
    ...favorites.slice(0, FAVORITE_SLOTS),
    ...Array(Math.max(0, FAVORITE_SLOTS - favorites.length)).fill(null),
  ];

  const photo = (
    <View style={[styles.photo, fill ? styles.photoFill : styles.photoFixed, { backgroundColor: theme.backgroundSelected }]}>
      {avatarUrl && !photoFailed ? (
        <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setPhotoFailed(true)} />
      ) : (
        <ThemedText themeColor="textSecondary" style={styles.photoLetter}>
          {displayName.charAt(0).toUpperCase()}
        </ThemedText>
      )}
      {badge && (
        <View style={styles.badge}>
          <ThemedText type="smallBold" style={styles.badgeText}>
            {badge}
          </ThemedText>
        </View>
      )}
      {onPhotoPress && (
        <View style={[styles.editBadge, { borderColor: theme.backgroundElement }]}>
          <ThemedText style={styles.editBadgeIcon}>✎</ThemedText>
        </View>
      )}
    </View>
  );

  const body = (
    <View style={[styles.card, fill && styles.cardFill, { backgroundColor: theme.backgroundElement }, style]}>
      {onPhotoPress ? <Pressable onPress={onPhotoPress}>{photo}</Pressable> : photo}

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <View style={styles.nameBlock}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {displayName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              @{username}
            </ThemedText>
          </View>
          <View style={styles.statBlock}>
            <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.caps}>
              {stat.label}
            </ThemedText>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText themeColor="textSecondary" style={styles.caps}>
            {favoritesLabel}
          </ThemedText>
          {favoritesAction && (
            <Pressable onPress={favoritesAction.onPress} hitSlop={Spacing.two}>
              <ThemedText type="smallBold" style={styles.link}>
                {favoritesAction.label}
              </ThemedText>
            </Pressable>
          )}
        </View>
        <View style={styles.posterRow}>
          {slots.map((slot, index) =>
            slot?.posterUrl ? (
              <Image key={slot.movieId} source={{ uri: slot.posterUrl }} style={styles.poster} contentFit="cover" />
            ) : (
              <View
                key={slot ? slot.movieId : `empty-${index}`}
                style={[styles.poster, { backgroundColor: theme.backgroundSelected, opacity: slot ? 1 : 0.5 }]}
              />
            ),
          )}
        </View>

        {(commonCount !== undefined || genres.length > 0) && (
          <View style={styles.footerRow}>
            {commonCount !== undefined && (
              <ThemedText type="small" style={styles.common}>
                <ThemedText type="smallBold" style={styles.link}>
                  {commonCount}
                </ThemedText>{' '}
                films in common
              </ThemedText>
            )}
            <View style={styles.chipRow}>
              {genres.map((genre) => (
                <View key={genre} style={[styles.chip, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText type="small">{genre}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {action && (
          <Pressable style={styles.actionButton} onPress={action.onPress}>
            <ThemedText style={styles.actionText}>{action.label}</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={fill ? styles.cardFill : undefined}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.four, overflow: 'hidden' },
  cardFill: { flex: 1 },
  photo: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoFill: { flex: 1, minHeight: 140 },
  photoFixed: { height: 280 },
  photoLetter: { fontSize: 120, lineHeight: 132, fontWeight: '700', opacity: 0.6 },
  badge: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    backgroundColor: AccentColor,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  badgeText: { color: '#fff', letterSpacing: 1 },
  editBadge: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: AccentColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeIcon: { color: '#fff', fontSize: 16, lineHeight: 18 },
  content: { padding: Spacing.three, gap: Spacing.three },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  nameBlock: { flex: 1 },
  name: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  statBlock: { alignItems: 'flex-end' },
  statValue: { color: AccentColor, fontSize: 40, lineHeight: 44, fontWeight: '800' },
  caps: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -Spacing.two },
  link: { color: AccentColor },
  posterRow: { flexDirection: 'row', gap: Spacing.two },
  poster: { flex: 1, aspectRatio: 2 / 3, borderRadius: Spacing.two },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  common: { flexShrink: 1 },
  chipRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Spacing.one },
  chip: { borderWidth: 1, borderRadius: Spacing.three, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  actionButton: { backgroundColor: AccentColor, borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
