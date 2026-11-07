import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { services } from '@/services/client';
import { useAuth } from '@/contexts/auth-context';
import type { BorrowRequest } from '@/services/types';
import { Badge, Button, Card, ErrorBanner, Field, InfoBanner, KeyValue, Loading, Screen, SectionTitle } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { ACTION_CONFIRM, ACTION_LABEL, BORROW_STATUS_HINT, availableActions, borrowLabel, borrowTone } from '@/lib/status';
import type { RequestAction } from '@/lib/status';
import { formatDate, formatDateTime } from '@/lib/dates';
import { confirmAction } from '@/lib/dialog';
import { getErrorMessage } from '@/lib/errors';
import { useLoad } from '@/hooks/use-load';

function timeline(r: BorrowRequest) {
  return [
    { label: 'Diajukan', at: r.requested_at },
    { label: 'Disetujui admin', at: r.approved_at },
    { label: 'Ditolak', at: r.rejected_at },
    { label: 'Barang diambil', at: r.picked_up_at },
    { label: 'Dikembalikan', at: r.returned_at },
    { label: 'Dibatalkan', at: r.cancelled_at },
  ].filter((e) => e.at);
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data, loading, error, setData } = useLoad(() => services.borrow.get(id), [id]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<RequestAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (!data) return <Screen><View style={{ padding: space.lg }}><ErrorBanner message={error ?? 'Data tidak ditemukan'} /></View></Screen>;

  const r = data;
  const actions = availableActions(isAdmin ? 'admin' : 'user', r.status);

  async function run(action: RequestAction) {
    if (!(await confirmAction({ title: ACTION_LABEL[action], message: ACTION_CONFIRM[action], destructive: action === 'reject' || action === 'cancel' }))) return;
    setBusy(action);
    setActionError(null);
    setSuccess(null);
    const n = note.trim() || undefined;
    try {
      let updated: BorrowRequest;
      if (!isAdmin) updated = await services.borrow.cancel(r.id);
      else if (action === 'approve') updated = await services.admin.approve(r.id, n);
      else if (action === 'reject') updated = await services.admin.reject(r.id, n);
      else if (action === 'pickup') updated = await services.admin.pickup(r.id);
      else if (action === 'return') updated = await services.admin.returnItem(r.id, n);
      else updated = await services.admin.cancel(r.id, n);
      setData(updated);
      setNote('');
      setSuccess(`Berhasil: ${ACTION_LABEL[action]}`);
    } catch (e) {
      setActionError(getErrorMessage(e, 'Aksi gagal'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 48 }}>
        <Text style={styles.title} testID="request-item">{r.item?.name ?? 'Barang dihapus'}</Text>
        <View style={{ flexDirection: 'row', marginVertical: space.sm }}>
          <Badge label={borrowLabel(r.status, r.is_overdue)} tone={borrowTone(r.status, r.is_overdue)} testID="request-status" />
        </View>
        <Text style={styles.hint}>{r.is_overdue ? 'Melewati tanggal pengembalian — segera kembalikan' : BORROW_STATUS_HINT[r.status]}</Text>

        <Card>
          {isAdmin ? <KeyValue label="Peminjam" value={r.borrower ? `${r.borrower.full_name} (${r.borrower.email})` : '-'} /> : null}
          <KeyValue label="Jumlah" value={`${r.quantity} unit`} />
          <KeyValue label="Tanggal pinjam" value={formatDate(r.borrow_date)} />
          <KeyValue label="Rencana kembali" value={formatDate(r.due_date)} />
          {r.note ? <KeyValue label="Catatan peminjam" value={r.note} /> : null}
          {r.admin_note ? <KeyValue label="Catatan admin" value={r.admin_note} /> : null}
        </Card>

        <SectionTitle>Riwayat status</SectionTitle>
        <Card>
          {timeline(r).map((e) => (
            <KeyValue key={e.label} label={e.label} value={formatDateTime(e.at)} />
          ))}
        </Card>

        <InfoBanner message={success} />
        <ErrorBanner message={actionError} />

        {actions.length > 0 ? (
          <View style={{ gap: space.sm }}>
            {isAdmin && actions.some((a) => a !== 'pickup') ? <Field label="Catatan untuk peminjam (opsional)" value={note} onChangeText={setNote} testID="admin-note" /> : null}
            {actions.map((a) => (
              <Button
                key={a}
                title={ACTION_LABEL[a]}
                testID={`action-${a}`}
                variant={a === 'reject' || a === 'cancel' ? 'danger' : 'primary'}
                loading={busy === a}
                disabled={busy !== null}
                onPress={() => run(a)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.muted, marginBottom: space.md },
});
