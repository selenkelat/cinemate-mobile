import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      initialRouteName="profile"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#208AEF',
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
    </Tabs>
  );
}
