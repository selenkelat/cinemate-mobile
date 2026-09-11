import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthContext';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // cold-start session restore still in flight
  if (user) return <Redirect href="/" />; // already signed in — nothing to do here

  return <Stack screenOptions={{ headerShown: false }} />;
}
