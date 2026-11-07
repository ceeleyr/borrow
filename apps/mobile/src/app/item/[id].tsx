import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/services/client';
import { useAuth } from '@/contexts/auth-context';
import { Badge, Button, Card, Chip, ErrorBanner, Field, KeyValue, Loading, Screen, SectionTitle, Stepper, Thumb } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { CONDITION_LABEL, itemStatusInfo } from '@/lib/status';
import { addDays, formatDate, todayString } from '@/lib/dates';
import { validateBorrowForm } from '@/lib/validation';
import { confirmAction, notify } from '@/lib/dialog';
import { getErrorMessage } from '@/lib/errors';
import { useLoad } from '@/hooks/use-load';

const DURATIONS = [1, 3, 7, 14];

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { data: item, loading, error } = useLoad(() => services.items.get(id), [id]);

  const today = useMemo(() => todayString(), []);
  const [qty, setQty] = useState(1);
  const [borrowDate, setBorrowDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(today, 3));
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loading />;
  if (!item) return <Screen><View style={{ padding: space.lg }}><ErrorBanner message={error ?? 'Barang tidak ditemukan'} /></View></Screen>;

  const info = itemStatusInfo(item);

  async function submit() {
    if (!item) return;
    const problem = validateBorrowForm({ quantity: qty, maxQuantity: item.available_quantity, borrowDate, dueDate, today });
    setFormError(problem);
    if (problem) return;
    setSubmitting(true);
    try {
      await services.borrow.create({ item_id: item.id, quantity: qty, borrow_date: borrowDate, due_date: dueDate, note: note.trim() || undefined });
      notify('Permintaan terkirim', 'Admin akan meninjau pengajuanmu. Pantau statusnya di tab Pinjaman.');
      router.back(); // kembali ke layar asal; tab Pinjaman otomatis memuat ulang saat dibuka
    } catch (e) {
      setFormError(getErrorMessage(e, 'Gagal mengajukan peminjaman'));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!(await confirmAction({ title: `Hapus ${item.name}?`, message: 'Barang yang sudah punya riwayat tidak bisa dihapus (nonaktifkan saja).', destructive: true, confirmText: 'Hapus' }))) return;
    try {
      await services.items.remove(item.id);
      router.back();
    } catch (e) {
      setFormError(getErrorMessage(e, 'Gagal menghapus'));
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 48 }}>
        {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.hero} /> : <View style={{ alignItems: 'center', marginBottom: space.md }}><Thumb size={120} /></View>}
        <Text style={styles.name} testID="item-name">{item.name}</Text>
        <View style={{ flexDirection: 'row', marginVertical: space.sm }}>
          <Badge label={info.label} tone={info.tone} testID="item-status" />
        </View>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

        <Card>
          <KeyValue label="Kategori" value={item.category ?? '-'} />
          <KeyValue label="Kondisi" value={CONDITION_LABEL[item.condition]} />
          <KeyValue label="Jumlah total" value={String(item.quantity)} />
          <KeyValue label="Tersedia" value={String(item.available_quantity)} />
        </Card>

        <ErrorBanner message={formError} />

        {isAdmin ? (
          <View style={{ gap: space.sm }}>
            <Button title="Ubah Barang" onPress={() => router.push({ pathname: '/admin/item-form', params: { id: item.id } })} testID="edit-item" />
            <Button title="Hapus Barang" variant="danger" onPress={remove} testID="delete-item" />
          </View>
        ) : info.canBorrow ? (
          <>
            <SectionTitle>Ajukan peminjaman</SectionTitle>
            <Card>
              <Text style={styles.label}>Jumlah</Text>
              <Stepper value={qty} min={1} max={item.available_quantity} onChange={setQty} />
              <View style={{ height: space.md }} />
              <Field label="Tanggal pinjam (YYYY-MM-DD)" value={borrowDate} onChangeText={setBorrowDate} autoCapitalize="none" testID="borrow-date" />
              <Field label="Rencana tanggal kembali (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} autoCapitalize="none" testID="due-date" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
                {DURATIONS.map((d) => (
                  <Chip key={d} label={`${d} hari`} testID={`dur-${d}`} active={dueDate === addDays(borrowDate, d)} onPress={() => setDueDate(addDays(borrowDate, d))} />
                ))}
              </View>
              <Text style={styles.hint}>Kembali pada {formatDate(dueDate)}</Text>
              <Field label="Catatan (opsional)" value={note} onChangeText={setNote} multiline placeholder="Untuk keperluan apa?" testID="borrow-note" />
              <Button title="Ajukan Peminjaman" onPress={submit} loading={submitting} testID="borrow-submit" />
            </Card>
          </>
        ) : (
          <Text style={styles.hint} testID="not-borrowable">Barang ini belum bisa dipinjam saat ini.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 200, borderRadius: radius.lg, marginBottom: space.md, backgroundColor: colors.border },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  desc: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: space.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: space.md },
});
