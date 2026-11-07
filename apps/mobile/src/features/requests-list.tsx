import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/services/client';
import type { BorrowRequest } from '@/services/types';
import { Badge, Card, Chip, EmptyState, ErrorBanner, Field, Header, Loading, Screen } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { BORROW_STATUSES, BORROW_STATUS_LABEL, borrowLabel, borrowTone } from '@/lib/status';
import type { BorrowStatus } from '@/lib/status';
import { formatDate } from '@/lib/dates';
import { useDebounced, useLoad } from '@/hooks/use-load';

export function RequestCard({ r, admin, onPress }: { r: BorrowRequest; admin: boolean; onPress: () => void }) {
  return (
    <Card onPress={onPress} testID={`request-card-${r.item?.name}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{r.item?.name ?? 'Barang dihapus'}</Text>
          {admin ? <Text style={styles.meta}>Peminjam: {r.borrower?.full_name ?? '-'}</Text> : null}
        </View>
        <Badge label={borrowLabel(r.status, r.is_overdue)} tone={borrowTone(r.status, r.is_overdue)} />
      </View>
      <Text style={[styles.meta, { marginTop: 6 }]}>
        {formatDate(r.borrow_date)} → {formatDate(r.due_date)} • {r.quantity} unit
      </Text>
    </Card>
  );
}

/** Admin: semua permintaan (sekaligus riwayat). User: riwayat pinjaman sendiri. */
export function RequestsList({ admin }: { admin: boolean }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const initial = BORROW_STATUSES.includes(params.status as BorrowStatus) ? (params.status as BorrowStatus) : '';
  const [status, setStatus] = useState<BorrowStatus | ''>(initial);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, refreshing, error, reload } = useLoad(
    () => (admin ? services.admin.requests({ status, search: debounced }) : services.borrow.mine({ status })),
    [admin, status, debounced]
  );

  return (
    <Screen>
      <Header title={admin ? 'Permintaan & Riwayat' : 'Pinjaman Saya'} subtitle={admin ? 'Proses dan pantau semua peminjaman' : 'Pantau status dan riwayat peminjamanmu'} />
      <View style={{ paddingHorizontal: space.lg }}>
        {admin ? <Field label="Cari peminjam / barang" value={search} onChangeText={setSearch} placeholder="Nama peminjam atau barang" testID="search-requests" /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md }}>
          <Chip label="Semua" active={status === ''} onPress={() => setStatus('')} testID="filter-all" />
          {BORROW_STATUSES.map((s) => (
            <Chip key={s} label={BORROW_STATUS_LABEL[s]} active={status === s} onPress={() => setStatus(s)} testID={`filter-${s}`} />
          ))}
        </ScrollView>
        <ErrorBanner message={error} />
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}
          refreshing={refreshing}
          onRefresh={reload}
          renderItem={({ item }) => <RequestCard r={item} admin={admin} onPress={() => router.push(`/request/${item.id}`)} />}
          ListEmptyComponent={<EmptyState title="Belum ada data" hint={admin ? undefined : 'Pilih barang di katalog lalu ajukan peminjaman'} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
});
