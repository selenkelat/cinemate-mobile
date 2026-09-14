import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { exportsApi, type UploadExportResponse } from '@/api/exports';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PickedFile = DocumentPicker.DocumentPickerAsset;

export default function UploadScreen() {
  const theme = useTheme();
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadExportResponse | null>(null);

  const onChooseFile = async () => {
    setError(null);
    // MIME type filtering for zip files is inconsistent across iOS/Android, so this is a hint,
    // not a guarantee — the extension check below is the real gate before uploading.
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });

    if (picked.canceled) return;

    const asset = picked.assets[0];
    if (!asset.name.toLowerCase().endsWith('.zip')) {
      setError("That doesn't look like a .zip file. Please choose your Letterboxd export ZIP.");
      setPickedFile(null);
      return;
    }

    setPickedFile(asset);
  };

  const onUpload = async () => {
    if (!pickedFile) return;
    setError(null);
    setIsUploading(true);
    try {
      const response = await exportsApi.upload(pickedFile);
      setResult(response);
    } catch (err) {
      // Logged, not just swallowed: a bare "couldn't reach the server" is the same message for
      // a wrong LAN IP, a dead backend, and a genuine RN networking failure — this is the one
      // place that tells them apart, and Metro streams console.error from the device.
      console.error('Export upload failed:', err);
      // The backend's own message ("Empty file.", "Only .zip exports...") is specific enough to
      // show directly — unlike the auth screens, there's no need to map it to a canned string.
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (result) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <ThemedText type="title" style={styles.title}>
            Import complete
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.statsBox}>
            <StatRow label="Watched" value={result.watchedCount} />
            <StatRow label="Rated" value={result.ratedCount} />
            <StatRow label="Liked" value={result.likedCount} />
            <StatRow label="New movies resolved" value={result.newMoviesResolved} />
          </ThemedView>

          {result.unresolvedTitles.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.statsBox}>
              <ThemedText type="smallBold">
                Couldn&apos;t match {result.unresolvedTitles.length}{' '}
                {result.unresolvedTitles.length === 1 ? 'title' : 'titles'}:
              </ThemedText>
              {result.unresolvedTitles.map((title, index) => (
                <ThemedText key={`${title}-${index}`} type="small" themeColor="textSecondary">
                  {title}
                </ThemedText>
              ))}
            </ThemedView>
          )}
        </ScrollView>

        <Pressable style={styles.button} onPress={() => router.replace('/favorites')}>
          <ThemedText style={styles.buttonText}>Continue to favorites</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Import your Letterboxd export
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.hint}>
        From letterboxd.com: Settings → Import & Export → Export Data. Upload the ZIP it gives
        you — we only read watched, ratings, and likes from it.
      </ThemedText>

      {pickedFile && (
        <ThemedView type="backgroundElement" style={styles.fileBox}>
          <ThemedText numberOfLines={1}>{pickedFile.name}</ThemedText>
        </ThemedView>
      )}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      {isUploading ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator color={theme.text} />
          <ThemedText>Uploading your export...</ThemedText>
        </View>
      ) : pickedFile ? (
        <>
          <Pressable style={styles.button} onPress={onUpload}>
            <ThemedText style={styles.buttonText}>Upload</ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onChooseFile}>
            <ThemedText type="linkPrimary">Choose a different file</ThemedText>
          </Pressable>
        </>
      ) : (
        <Pressable style={styles.button} onPress={onChooseFile}>
          <ThemedText style={styles.buttonText}>Choose export ZIP</ThemedText>
        </Pressable>
      )}
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
  container: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center' },
  hint: { textAlign: 'center' },
  fileBox: { borderRadius: Spacing.two, padding: Spacing.three },
  error: { color: '#d33', textAlign: 'center' },
  uploadingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.two },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  secondaryButton: { alignItems: 'center', padding: Spacing.two },
  buttonText: { color: '#fff', fontWeight: '600' },
  resultScroll: { gap: Spacing.three, paddingBottom: Spacing.three },
  statsBox: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
