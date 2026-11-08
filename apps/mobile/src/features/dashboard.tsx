import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { services } from '@/services/client';
import { useAuth } from '@/contexts/auth-context';
import { ErrorBanner, Header, Loading, SectionTitle, Screen } from '@/components/ui';
import { RequestCard } from './requests-list';
import { colors, space, toneColors } from '@/constants/theme';
import type { Tone } from '@/lib/status';
import { useLoad } from '@/hooks/use-load';

type StatCardItem = {
  key: string;
  label: string;
  value: number | string;
  icon: string;
  tone: Tone;
  go: () => void;
};

export function Dashboard() {
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();
  const stats = useLoad(() => services.admin.stats());
  const pending = useLoad(() => services.admin.requests({ status: 'pending' }));

  const s = stats.data;
  const cards: StatCardItem[] = useMemo(() => {
    if (!s) return [];
    const list: StatCardItem[] = [
      {
        key: 'pending',
        label: 'Menunggu Persetujuan',
        value: s.pendingRequests,
        icon: '⏳',
        tone: 'warning',
        go: () => router.push({ pathname: '/requests', params: { status: 'pending' } }),
      },
      {
        key: 'approved',
        label: 'Siap Diambil',
        value: s.awaitingPickup,
        icon: '📦',
        tone: 'info',
        go: () => router.push({ pathname: '/requests', params: { status: 'approved' } }),
      },
      {
        key: 'overdue',
        label: 'Terlambat Kembali',
        value: s.overdue,
        icon: '⚠️',
        tone: s.overdue > 0 ? 'danger' : 'neutral',
        go: () => router.push('/requests'),
      },
      {
        key: 'items',
        label: 'Barang Tersedia',
        value: `${s.availableItems}/${s.totalItems}`,
        icon: '🏷️',
        tone: 'success',
        go: () => router.push('/items'),
      },
    ];

    // Kelola Pengguna hanya ditampilkan dan diakses oleh Superadmin
    if (isSuperAdmin) {
      list.push({
        key: 'users',
        label: 'Kelola Pengguna',
        value: s.totalUsers,
        icon: '👥',
        tone: 'neutral',
        go: () => router.push('/users'),
      });
    }

    return list;
  }, [s, isSuperAdmin, router]);

  const roleText = isSuperAdmin ? 'Superadmin' : 'Admin';

  return (
    <Screen>
      <Header
        title="Dashboard"
        subtitle={`Halo, ${user?.full_name ?? roleText} (${roleText})`}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}>
        <ErrorBanner message={stats.error} />
        {stats.loading ? (
          <Loading />
        ) : (
          <View style={styles.grid}>
            {cards.map((c) => {
              const tone = toneColors[c.tone];
              return (
                <Pressable
                  key={c.key}
                  onPress={c.go}
                  style={({ pressed }) => [
                    styles.statCard,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}
                  testID={`stat-${c.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.label}: ${c.value}`}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.iconBadge, { backgroundColor: tone.bg }]}>
                      <Text style={styles.iconText}>{c.icon}</Text>
                    </View>
                    <Text style={styles.arrowHint}>›</Text>
                  </View>
                  <Text style={[styles.value, { color: tone.fg }]} testID={`stat-${c.key}-value`}>
                    {c.value}
                  </Text>
                  <Text style={styles.label}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <SectionTitle>Perlu tindakan</SectionTitle>
        {(pending.data ?? []).length === 0 ? (
          <Text style={{ color: colors.muted }}>Tidak ada permintaan yang menunggu 🎉</Text>
        ) : (
          (pending.data ?? []).slice(0, 5).map((r) => (
            <RequestCard key={r.id} r={r} admin onPress={() => router.push(`/request/${r.id}`)} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.md,
    columnGap: space.md,
    marginBottom: space.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    // Shadow untuk iOS dan Web
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    // Elevation untuk Android
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  arrowHint: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.faint,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
});
