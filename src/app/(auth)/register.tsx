import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // No client-side minimum beyond non-empty: the backend (AuthService.RegisterAsync) doesn't
  // enforce a password length rule either, so inventing one here would reject input the server
  // would happily accept.
  const canSubmit = Boolean(username && displayName && password);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await register(username.trim(), password, displayName.trim());
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'That username is already taken.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Create account
      </ThemedText>

      <TextInput
        style={inputStyle}
        placeholder="Username"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={inputStyle}
        placeholder="Display name"
        placeholderTextColor={theme.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={inputStyle}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <Pressable
        style={[styles.button, (isSubmitting || !canSubmit) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={isSubmitting || !canSubmit}>
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Create account</ThemedText>
        )}
      </Pressable>

      <Link href="/login" style={styles.link}>
        <ThemedText type="linkPrimary">Already have an account? Log in</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center', marginBottom: Spacing.four },
  input: { borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  error: { color: '#d33', textAlign: 'center' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { alignSelf: 'center', marginTop: Spacing.two },
});
