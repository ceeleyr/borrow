import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { services } from '@/services/client';
import { useAuth } from '@/contexts/auth-context';
import { Card, ErrorBanner, Header, Loading, SectionTitle, Screen } from '@/components/ui';
import { RequestCard } from './requests-list';
import { colors, space, toneColors } from '@/constants/theme';
import type { Tone } from '@/lib/status';
import { useLoad } from '@/hooks/use-load';

export function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const stats = useLoad(() => services.admin.stats());
  const pending = useLoad(() => services.admin.requests({ status: 'pending' }));

  const s = stats.data;
  const cards: { key: string; label: string; value: number | string; tone: Tone; go: () => void }[] = s
    ? [
        { key: 'pending', label: 'Menunggu persetujuan', value: s.pendingRequests, tone: 'warning', go: () => router.push({ pathname: '/requests', params: { status: 'pending' } }) },
        { key: 'approved', label: 'Siap diambil', value: s.awaitingPickup, tone: 'info', go: () => router.push({ pathname: '/requests', params: { status: 'approved' } }) },
        { key: 'borrowed', label: 'Sedang dipinjam', value: s.activeBorrows, tone: 'info', go: () => router.push({ pathname: '/requests', params: { status: 'borrowed' } }) },
        { key: 'overdue', label: 'Terlambat', value: s.overdue, tone: s.overdue > 0 ? 'danger' : 'neutral', go: () => router.push({ pathname: '/requests', params: { status: 'borrowed' } }) },
        { key: 'items', label: 'Barang tersedia', value: `${s.availableItems}/${s.totalItems}`, tone: 'success', go: () => router.push('/items') },
        { key: 'users', label: 'Pengguna', value: s.totalUsers, tone: 'neutral', go: () => router.push('/users') },
      ]
    : [];

  return (
    <Screen>
      <Header title="Dashboard" subtitle={`Halo, ${user?.full_name ?? 'Admin'}`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}>
        <ErrorBanner message={stats.error} />
        {stats.loading ? (
          <Loading />
        ) : (
          <View style={styles.grid}>
            {cards.map((c) => (
              <Card key={c.key} onPress={c.go} style={styles.stat} testID={`stat-${c.key}`}>
                <Text style={[styles.value, { color: toneColors[c.tone].fg }]} testID={`stat-${c.key}-value`}>{c.value}</Text>
                <Text style={styles.label}>{c.label}</Text>
              </Card>
            ))}
          </View>
        )}
        <SectionTitle>Perlu tindakan</SectionTitle>
        {(pending.data ?? []).length === 0 ? (
          <Text style={{ color: colors.muted }}>Tidak ada permintaan yang menunggu 🎉</Text>
        ) : (
          (pending.data ?? []).slice(0, 5).map((r) => <RequestCard key={r.id} r={r} admin onPress={() => router.push(`/request/${r.id}`)} />)
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { flexBasis: '47%', flexGrow: 1, marginBottom: 0 },
  value: { fontSize: 28, fontWeight: '800' },
  label: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
