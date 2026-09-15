import { Tabs } from 'expo-router';

import { useUnread } from '@/chat/UnreadContext';
import { AccentColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  const { totalUnread } = useUnread();

  return (
    <Tabs
      initialRouteName="profile"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AccentColor,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          // 0 must become undefined, not be passed as-is — the badge renders whenever its value
          // is non-nullish, so a literal 0 would show a visible "0" pill.
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: AccentColor, color: '#fff' },
        }}
      />
    </Tabs>
  );
}
