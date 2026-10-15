import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useUnread } from '@/chat/UnreadContext';
import { AccentColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// expo-symbols is already a dependency: SF Symbols on iOS, Material Symbols on Android — no new
// icon library needed for three tab icons.
function TabIcon({ name, color }: { name: SymbolViewProps['name']; color: ColorValue }) {
  return <SymbolView name={name} tintColor={color} size={24} />;
}

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
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'person', android: 'person' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'rectangle.stack', android: 'style' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'bubble.left', android: 'chat_bubble' }} color={color} />,
          // 0 must become undefined, not be passed as-is — the badge renders whenever its value
          // is non-nullish, so a literal 0 would show a visible "0" pill.
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: AccentColor, color: '#fff' },
        }}
      />
    </Tabs>
  );
}
