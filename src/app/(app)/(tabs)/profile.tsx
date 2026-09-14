import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { avatarApi } from '@/api/avatar';
import { ApiError } from '@/api/client';
import { profileApi, type UserProfileDto } from '@/api/profile';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/avatar';
import { CategoryBox } from '@/components/category-box';
import { FavoriteMovieRow } from '@/components/favorite-movie-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await profileApi.get(user!.id);
      setProfile(result);
    } catch (err) {
      console.error('Load profile failed:', err);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onAvatarPress = async () => {
    setAvatarError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError('Photo library access is needed to set a profile picture.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (picked.canceled) return;

    const asset = picked.assets[0];
    setIsSavingAvatar(true);
    try {
      const result = await avatarApi.upload({ uri: asset.uri, name: asset.fileName ?? 'avatar.jpg' });
      setProfile((prev) => (prev ? { ...prev, avatarUrl: result.avatarUrl } : prev));
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setAvatarError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const onRemoveAvatar = async () => {
    setAvatarError(null);
    setIsSavingAvatar(true);
    try {
      await avatarApi.remove();
      setProfile((prev) => (prev ? { ...prev, avatarUrl: null } : prev));
    } catch (err) {
      console.error('Avatar removal failed:', err);
      setAvatarError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (error || !profile) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error ?? 'Something went wrong.'}</ThemedText>
        <Pressable style={styles.button} onPress={load}>
          <ThemedText style={styles.buttonText}>Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // No "not imported yet" empty state here: the onboarding gate at "/" only ever lands a
  // signed-in user on this tab once watchedCount > 0, so that branch is unreachable through
  // in-app navigation and isn't worth carrying as defensive code.

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          My Profile
        </ThemedText>
        <Pressable onPress={() => router.push('/settings')}>
          <ThemedText type="linkPrimary">Settings</ThemedText>
        </Pressable>
      </View>

      <View style={styles.avatarSection}>
        <Avatar
          avatarUrl={profile.avatarUrl}
          displayName={user?.displayName ?? '?'}
          onPress={isSavingAvatar ? undefined : onAvatarPress}
          style={styles.avatar}
        />
        {isSavingAvatar ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          profile.avatarUrl && (
            <Pressable onPress={onRemoveAvatar}>
              <ThemedText type="linkPrimary">Remove photo</ThemedText>
            </Pressable>
          )
        )}
        {avatarError ? <ThemedText style={styles.error}>{avatarError}</ThemedText> : null}
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          Favorites
        </ThemedText>
        {profile.favoriteMovies.length === 0 ? (
          <ThemedText themeColor="textSecondary">You haven&apos;t picked any favorites yet.</ThemedText>
        ) : (
          profile.favoriteMovies.map((favorite) => <FavoriteMovieRow key={favorite.movieId} favorite={favorite} />)
        )}
      </ThemedView>

      <CategoryBox
        title="Watched"
        count={profile.watchedCount}
        onPress={() => router.push({ pathname: '/movie-list', params: { title: 'Watched', source: 'watched' } })}
      />
      <CategoryBox
        title="Liked"
        count={profile.likedCount}
        onPress={() => router.push({ pathname: '/movie-list', params: { title: 'Liked', source: 'liked' } })}
      />

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          Ratings
        </ThemedText>
        {profile.ratingStats.count === 0 ? (
          <ThemedText themeColor="textSecondary">No ratings yet.</ThemedText>
        ) : (
          <>
            <StatRow label="Rated" value={profile.ratedCount} />
            <StatRow label="Average" value={profile.ratingStats.average!} />
            <StatRow label="Median" value={profile.ratingStats.median!} />
          </>
        )}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          Genres
        </ThemedText>
        {profile.genreProfile.slice(0, 8).map((genre) => (
          <View key={genre.genre} style={styles.genreRow}>
            <View style={styles.genreLabelRow}>
              <ThemedText type="small">{genre.genre}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {genre.percentage}%
              </ThemedText>
            </View>
            <View style={[styles.genreBarTrack, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.genreBarFill, { width: `${Math.min(genre.percentage, 100)}%` }]} />
            </View>
          </View>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <ThemedText>{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { textAlign: 'center' },
  avatarSection: { alignItems: 'center', gap: Spacing.two },
  avatar: {},
  error: { color: '#d33', textAlign: 'center' },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { marginBottom: Spacing.one },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genreRow: { gap: Spacing.half },
  genreLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genreBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  genreBarFill: { height: 6, backgroundColor: '#208AEF' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
