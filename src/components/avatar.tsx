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
    return (
      <Pressable onPress={onPress} style={style}>
        {content}
      </Pressable>
    );
  }

  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  image: {},
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
