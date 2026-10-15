import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { avatarApi } from '@/api/avatar';
import { ApiError } from '@/api/client';
import { profileApi, type UserProfileDto } from '@/api/profile';
import { subscriptionApi } from '@/api/subscription';
import { useAuth } from '@/auth/AuthContext';
import { CategoryBox } from '@/components/category-box';
import { ProfileCard } from '@/components/profile-card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccentColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // Only drives the PREMIUM badge — fetched separately and best-effort, so a failure here
  // never blocks the profile itself (no badge is the safe fallback).
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    subscriptionApi
      .get()
      .then((status) => setIsPremium(status.isPremium))
      .catch((err) => console.error('Load subscription status failed:', err));
  }, []);

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
    <ThemedView style={styles.screen}>
      <ScreenHeader
        title="My Profile"
        style={styles.headerBar}
        right={
          <Pressable onPress={() => router.push('/settings')}>
            <ThemedText type="linkPrimary">Settings</ThemedText>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.container}>
      <ProfileCard
        avatarUrl={profile.avatarUrl}
        displayName={user?.displayName ?? '?'}
        username={user?.username ?? ''}
        stat={{ value: String(profile.watchedCount), label: 'Films watched' }}
        favoritesLabel="My favorites"
        favorites={profile.favoriteMovies}
        favoritesAction={{ label: 'Edit', onPress: () => router.push('/favorites') }}
        genres={profile.genreProfile.slice(0, 3).map((g) => g.genre)}
        badge={isPremium ? 'PREMIUM' : undefined}
        onPhotoPress={isSavingAvatar ? undefined : onAvatarPress}
      />

      {(isSavingAvatar || profile.avatarUrl || avatarError) && (
        <View style={styles.avatarSection}>
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
      )}

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
    </ThemedView>
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
  screen: { flex: 1 },
  headerBar: { paddingHorizontal: Spacing.four },
  container: { flexGrow: 1, paddingHorizontal: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  avatarSection: { alignItems: 'center', gap: Spacing.two },
  error: { color: '#d33', textAlign: 'center' },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { marginBottom: Spacing.one },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genreRow: { gap: Spacing.half },
  genreLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genreBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  genreBarFill: { height: 6, backgroundColor: AccentColor },
  button: {
    backgroundColor: AccentColor,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
