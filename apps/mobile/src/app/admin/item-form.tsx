import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { services } from '@/services/client';
import { useAuth } from '@/contexts/auth-context';
import { Button, Chip, ErrorBanner, Field, Loading, Screen } from '@/components/ui';
import { CategoryPicker } from '@/components/category-picker';
import { colors, radius, space } from '@/constants/theme';
import { CONDITIONS, CONDITION_LABEL } from '@/lib/status';
import type { ItemCondition } from '@/lib/status';
import { validateItemForm } from '@/lib/validation';
import type { FormErrors } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';

export default function ItemFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const editing = Boolean(id);

  const [loading, setLoading] = useState(editing);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [quantity, setQuantity] = useState('1');
  const [unavailable, setUnavailable] = useState(false);

  // Manajemen foto langsung (tanpa URL)
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pickedAsset, setPickedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const [errors, setErrors] = useState<FormErrors<'name' | 'quantity'>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    services.items
      .get(id)
      .then((it) => {
        setName(it.name);
        setDescription(it.description ?? '');
        setCategory(it.category ?? '');
        setCondition(it.condition);
        setQuantity(String(it.quantity));
        setImagePreview(it.image_url ?? null);
        setUnavailable(it.status === 'unavailable');
      })
      .catch((e) => setServerError(getErrorMessage(e, 'Gagal memuat barang')))
      .finally(() => setLoading(false));
  }, [id]);

  if (!isAdmin) return <Redirect href="/" />;
  if (loading) return <Loading />;

  async function pickFromGallery() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setPickedAsset(asset);
        setImagePreview(asset.uri);
        setImageRemoved(false);
      }
    } catch (e) {
      setServerError(getErrorMessage(e, 'Gagal memilih foto'));
    }
  }

  async function takePhoto() {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Izin Kamera', 'Izin kamera dibutuhkan untuk mengambil foto barang.');
          return;
        }
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setPickedAsset(asset);
        setImagePreview(asset.uri);
        setImageRemoved(false);
      }
    } catch (e) {
      setServerError(getErrorMessage(e, 'Gagal mengambil foto dari kamera'));
    }
  }

  function removePhoto() {
    setPickedAsset(null);
    setImagePreview(null);
    setImageRemoved(true);
  }

  async function save() {
    const { errors: found, payload } = validateItemForm({
      name,
      description,
      category,
      condition,
      quantity,
      imageUrl: imageRemoved ? null : (pickedAsset ? null : imagePreview),
      unavailable,
    });
    setErrors(found);
    setServerError(null);
    if (!payload) return;

    setSaving(true);
    try {
      let savedItem;
      if (id) {
        if (imageRemoved) {
          payload.image_url = null;
        }
        savedItem = await services.items.update(id, payload);
      } else {
        savedItem = await services.items.create(payload);
      }

      // Upload file foto bila ada foto baru yang dipilih
      if (pickedAsset && savedItem?.id) {
        await services.items.uploadImage(savedItem.id, pickedAsset);
      }

      router.back();
    } catch (e) {
      setServerError(getErrorMessage(e, 'Gagal menyimpan barang'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: editing ? 'Ubah Barang' : 'Tambah Barang' }} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={serverError} />
        
        {/* Nama Barang */}
        <Field label="Nama barang *" value={name} onChangeText={setName} error={errors.name} testID="form-name" />

        {/* Dropdown Kategori dengan Add Category */}
        <CategoryPicker
          label="Kategori"
          value={category}
          onChange={setCategory}
          testID="form-category"
        />

        {/* Deskripsi */}
        <Field label="Deskripsi" value={description} onChangeText={setDescription} multiline testID="form-description" />

        {/* Kondisi */}
        <Text style={styles.sectionLabel}>Kondisi</Text>
        <View style={{ flexDirection: 'row', marginBottom: space.md }}>
          {CONDITIONS.map((c) => (
            <Chip key={c} label={CONDITION_LABEL[c]} active={condition === c} onPress={() => setCondition(c)} testID={`cond-${c}`} />
          ))}
        </View>

        {/* Jumlah Total */}
        <Field label="Jumlah total *" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" error={errors.quantity} testID="form-quantity" />

        {/* Foto Barang Langsung (Upload File / Kamera, bukan URL) */}
        <Text style={styles.sectionLabel}>Foto Barang</Text>
        {imagePreview ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: imagePreview }} style={styles.previewImage} resizeMode="cover" />
            <View style={styles.previewActions}>
              <TouchableOpacity style={[styles.photoBtn, styles.photoBtnChange]} onPress={pickFromGallery} testID="change-photo-btn">
                <Text style={styles.photoBtnText}>🖼️ Ganti Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoBtn, styles.photoBtnCamera]} onPress={takePhoto} testID="camera-photo-btn">
                <Text style={styles.photoBtnText}>📷 Kamera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoBtn, styles.photoBtnRemove]} onPress={removePhoto} testID="remove-photo-btn">
                <Text style={styles.photoBtnRemoveText}>🗑️ Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyPhotoBox}>
            <Text style={{ fontSize: 34, marginBottom: 6 }}>📷</Text>
            <Text style={styles.emptyPhotoTitle}>Upload Foto Barang</Text>
            <Text style={styles.emptyPhotoSubtitle}>Pilih langsung dari galeri atau kamera perangkat</Text>
            <View style={styles.emptyPhotoActions}>
              <TouchableOpacity style={[styles.photoBtn, styles.photoBtnPrimary]} onPress={pickFromGallery} testID="pick-photo-gallery">
                <Text style={styles.photoBtnPrimaryText}>🖼️ Buka Galeri</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoBtn, styles.photoBtnSecondary]} onPress={takePhoto} testID="take-photo-camera">
                <Text style={styles.photoBtnText}>📷 Ambil Foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status */}
        <Text style={[styles.sectionLabel, { marginTop: space.md }]}>Status</Text>
        <View style={{ flexDirection: 'row', marginBottom: space.lg }}>
          <Chip label="Bisa dipinjam" active={!unavailable} onPress={() => setUnavailable(false)} testID="status-available" />
          <Chip label="Nonaktif" active={unavailable} onPress={() => setUnavailable(true)} testID="status-unavailable" />
        </View>

        <Button title={editing ? 'Simpan Perubahan' : 'Tambah Barang'} onPress={save} loading={saving} testID="form-submit" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  previewCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
  },
  previewActions: {
    flexDirection: 'row',
    padding: space.sm,
    gap: space.xs,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyPhotoBox: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: 'center',
    marginBottom: space.md,
  },
  emptyPhotoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptyPhotoSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    marginBottom: space.md,
    textAlign: 'center',
  },
  emptyPhotoActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  photoBtn: {
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnPrimary: {
    backgroundColor: colors.primary,
  },
  photoBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  photoBtnSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photoBtnChange: {
    backgroundColor: '#eff6ff',
    flex: 1,
  },
  photoBtnCamera: {
    backgroundColor: '#f3f4f6',
    flex: 1,
  },
  photoBtnRemove: {
    backgroundColor: '#fee2e2',
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  photoBtnRemoveText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
