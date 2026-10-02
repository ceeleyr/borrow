import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { getItems, type Item } from '@/services/items';
import { useAuth } from '@/contexts/auth-context';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    try {
      setError('');
      const data = await getItems();
      setItems(data);
    } catch (e) {
      setError('Gagal memuat data. Cek koneksi ke server.');
    }
  }, []);

  useEffect(() => {
    loadItems().finally(() => setLoading(false));
  }, [loadItems]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Beranda</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Belum ada barang tersedia</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isAvailable = item.status === 'available';
          return (
            <Pressable
              style={[styles.card, !isAvailable && styles.cardUnavailable]}
              onPress={() => router.push(`/item/${item.id}`)}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={styles.placeholderText}>Tidak ada gambar</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.category ? <Text style={styles.cardCategory}>{item.category}</Text> : null}
                <Text style={styles.cardOwner}>oleh {item.owner?.full_name ?? 'Unknown'}</Text>
                {!isAvailable && (
                  <View style={styles.unavailableBadge}>
                    <Text style={styles.unavailableBadgeText}>Sedang Dipinjam</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: 90,
    height: 90,
  },
  cardImagePlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
    cardOwner: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardUnavailable: {
    opacity: 0.6,
  },
  unavailableBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  unavailableBadgeText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '600',
  },
});