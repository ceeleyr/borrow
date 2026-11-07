import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { colors, MAX_WIDTH } from '@/constants/theme';

type Entry = { name: string; href: string; label: string; icon: string };

const USER_TABS: Entry[] = [
  { name: 'home', href: '/', label: 'Katalog', icon: '🏠' },
  { name: 'requests', href: '/requests', label: 'Pinjaman', icon: '📋' },
  { name: 'profile', href: '/profile', label: 'Profil', icon: '👤' },
];

const ADMIN_TABS: Entry[] = [
  { name: 'home', href: '/', label: 'Dashboard', icon: '📊' },
  { name: 'requests', href: '/requests', label: 'Permintaan', icon: '📋' },
  { name: 'items', href: '/items', label: 'Barang', icon: '📦' },
  { name: 'users', href: '/users', label: 'Pengguna', icon: '👥' },
  { name: 'profile', href: '/profile', label: 'Profil', icon: '👤' },
];

function TabButton({ entry, isFocused, ...props }: TabTriggerSlotProps & { entry: Entry }) {
  return (
    <Pressable {...props} testID={`tab-${entry.name}`} accessibilityLabel={entry.label} style={styles.tab}>
      <Text style={{ fontSize: 20, opacity: isFocused ? 1 : 0.55 }}>{entry.icon}</Text>
      <Text style={[styles.tabLabel, isFocused && { color: colors.primary, fontWeight: '700' }]}>{entry.label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const tabs = isAdmin ? ADMIN_TABS : USER_TABS;

  return (
    // TabSlot & TabList harus anak langsung dari <Tabs> agar navigator menemukan rute.
    <Tabs style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.bg }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        {/* style harus objek tunggal (bukan array) karena TabList asChild men-spread-nya; TabTrigger harus tepat satu lapis di bawah pembungkus TabList asChild */}
        <View style={StyleSheet.flatten([styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }])}>
          {tabs.map((t) => (
            <TabTrigger key={`${isAdmin}-${t.name}`} name={t.name} href={t.href as never} asChild>
              <TabButton entry={t} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 2, gap: 2 },
  tabLabel: { fontSize: 11, color: colors.muted },
});
