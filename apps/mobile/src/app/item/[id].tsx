import { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getItemById, type Item } from '@/services/items';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadItem() {
      try {
        const data = await getItemById(id);
        setItem(data);
      } catch (e) {
        setError('Gagal memuat detail barang');
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Barang tidak ditemukan'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: item.name }} />

      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>Tidak ada gambar</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{item.name}</Text>
        {item.category ? <Text style={styles.category}>{item.category}</Text> : null}

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>

        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        <View style={styles.ownerSection}>
          <Text style={styles.ownerLabel}>Pemilik</Text>
          <Text style={styles.ownerName}>{item.owner?.full_name ?? 'Unknown'}</Text>
        </View>

        {item.status === 'available' && (
          <Pressable style={styles.borrowButton}>
            <Text style={styles.borrowButtonText}>Ajukan Pinjam</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
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
  },
  errorText: {
    color: '#ef4444',
  },
  image: {
    width: '100%',
    height: 250,
  },
  imagePlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  statusText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 20,
  },
  ownerSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginBottom: 20,
  },
  ownerLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  borrowButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  borrowButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});