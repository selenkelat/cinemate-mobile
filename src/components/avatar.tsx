import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface AvatarProps {
  avatarUrl: string | null;
  displayName: string;
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Cloudinary delivery URLs are plain public CDN links (no auth headers needed) — this is a pure
// presentation component. Falls back to a letter badge when there's no photo, or the photo
// fails to load.
export function Avatar({ avatarUrl, displayName, size = 120, onPress, style }: AvatarProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  const content =
    avatarUrl && !failed ? (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.image, dimensions]}
        contentFit="cover"
        onError={() => setFailed(true)}
      />
    ) : (
      <View style={[styles.placeholder, dimensions, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="title">{displayName.charAt(0).toUpperCase()}</ThemedText>
      </View>
    );

  if (onPress) {
    // The edit badge only shows when onPress is given (Profile's own avatar) — Matches deck
    // cards render other people's avatars with no onPress, so no badge there. It signals the
    // avatar is tappable at all, which "tap the photo to change it" isn't otherwise obvious.
    return (
      <Pressable onPress={onPress} style={style}>
        {content}
        <View style={[styles.editBadge, { backgroundColor: '#208AEF', borderColor: theme.background }]}>
          <ThemedText style={styles.editBadgeIcon}>✎</ThemedText>
        </View>
      </Pressable>
    );
  }

  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  image: {},
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeIcon: { color: '#fff', fontSize: 14, lineHeight: 16 },
});
