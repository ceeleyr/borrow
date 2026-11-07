import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/services/client';
import { useAuth } from '@/contexts/auth-context';
import { Button, Chip, ErrorBanner, Field, Loading, Screen } from '@/components/ui';
import { colors, space } from '@/constants/theme';
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
  const [imageUrl, setImageUrl] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [errors, setErrors] = useState<FormErrors<'name' | 'quantity' | 'imageUrl'>>({});
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
        setImageUrl(it.image_url ?? '');
        setUnavailable(it.status === 'unavailable');
      })
      .catch((e) => setServerError(getErrorMessage(e, 'Gagal memuat barang')))
      .finally(() => setLoading(false));
  }, [id]);

  if (!isAdmin) return <Redirect href="/" />;
  if (loading) return <Loading />;

  async function save() {
    const { errors: found, payload } = validateItemForm({ name, description, category, condition, quantity, imageUrl, unavailable });
    setErrors(found);
    setServerError(null);
    if (!payload) return;
    setSaving(true);
    try {
      if (id) await services.items.update(id, payload);
      else await services.items.create(payload);
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
        <Field label="Nama barang *" value={name} onChangeText={setName} error={errors.name} testID="form-name" />
        <Field label="Kategori" value={category} onChangeText={setCategory} placeholder="Mis. Elektronik" testID="form-category" />
        <Field label="Deskripsi" value={description} onChangeText={setDescription} multiline testID="form-description" />
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Kondisi</Text>
        <View style={{ flexDirection: 'row', marginBottom: space.md }}>
          {CONDITIONS.map((c) => (
            <Chip key={c} label={CONDITION_LABEL[c]} active={condition === c} onPress={() => setCondition(c)} testID={`cond-${c}`} />
          ))}
        </View>
        <Field label="Jumlah total *" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" error={errors.quantity} testID="form-quantity" />
        <Field label="URL gambar (opsional)" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" placeholder="https://..." error={errors.imageUrl} testID="form-image" />
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Status</Text>
        <View style={{ flexDirection: 'row', marginBottom: space.lg }}>
          <Chip label="Bisa dipinjam" active={!unavailable} onPress={() => setUnavailable(false)} testID="status-available" />
          <Chip label="Nonaktif" active={unavailable} onPress={() => setUnavailable(true)} testID="status-unavailable" />
        </View>
        <Button title={editing ? 'Simpan Perubahan' : 'Tambah Barang'} onPress={save} loading={saving} testID="form-submit" />
      </ScrollView>
    </Screen>
  );
}
