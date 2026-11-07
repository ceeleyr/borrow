import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { services } from '@/services/client';
import type { Item } from '@/services/types';
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Header, Loading, Screen, Thumb } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { CONDITION_LABEL, itemStatusInfo } from '@/lib/status';
import { useDebounced, useLoad } from '@/hooks/use-load';

export function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const info = itemStatusInfo(item);
  return (
    <Card onPress={onPress} testID={`item-card-${item.name}`}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Thumb uri={item.image_url} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.category ?? 'Tanpa kategori'} • Kondisi {CONDITION_LABEL[item.condition]}
          </Text>
          <Text style={styles.meta}>Stok {item.available_quantity} dari {item.quantity}</Text>
          <Badge label={info.label} tone={info.tone} />
        </View>
      </View>
    </Card>
  );
}

/** Dipakai sebagai Katalog (user) dan Kelola Barang (admin). */
export function ItemList({ admin }: { admin: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const { data, loading, refreshing, error, reload } = useLoad(() => services.items.list({ search: debounced }), [debounced]);

  return (
    <Screen>
      <Header
        title={admin ? 'Kelola Barang' : 'Katalog Barang'}
        subtitle={admin ? 'Tambah, ubah, dan nonaktifkan barang' : 'Pilih barang yang ingin dipinjam'}
        right={admin ? <Button small title="+ Tambah" testID="add-item" onPress={() => router.push('/admin/item-form')} /> : undefined}
      />
      <View style={{ paddingHorizontal: space.lg }}>
        <Field label="Cari barang" value={search} onChangeText={setSearch} placeholder="Nama, kategori, atau deskripsi" testID="search-items" />
        <ErrorBanner message={error} />
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}
          refreshing={refreshing}
          onRefresh={reload}
          renderItem={({ item }) => <ItemCard item={item} onPress={() => router.push(`/item/${item.id}`)} />}
          ListEmptyComponent={<EmptyState title="Belum ada barang" hint={search ? 'Coba kata kunci lain' : undefined} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
});
