import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthContext';
import { UnreadProvider } from '@/chat/UnreadContext';

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // cold-start session restore still in flight
  if (!user) return <Redirect href="/login" />;

  return (
    <UnreadProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </UnreadProvider>
  );
}
