import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect username or password.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Cinemate
      </ThemedText>

      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        placeholder="Username"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <Pressable
        style={[styles.button, (isSubmitting || !username || !password) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={isSubmitting || !username || !password}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Log in</ThemedText>}
      </Pressable>

      <Link href="/register" style={styles.link}>
        <ThemedText type="linkPrimary">Don&apos;t have an account? Register</ThemedText>
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
