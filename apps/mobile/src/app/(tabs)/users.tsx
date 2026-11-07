import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { services } from '@/services/client';
import { useAuth } from '@/contexts/auth-context';
import type { Profile } from '@/services/types';
import { Badge, Button, Card, EmptyState, ErrorBanner, Header, Loading, Screen } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { confirmAction } from '@/lib/dialog';
import { getErrorMessage } from '@/lib/errors';
import { useLoad } from '@/hooks/use-load';

export default function UsersTab() {
  const { isAdmin, user: me } = useAuth();
  const { data, loading, refreshing, error, reload } = useLoad(() => services.admin.users(), []);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isAdmin) return <Redirect href="/" />;

  async function toggleRole(u: Profile) {
    const next = u.role === 'admin' ? 'user' : 'admin';
    if (!(await confirmAction({ title: `Ubah ${u.full_name} menjadi ${next}?` }))) return;
    try {
      setActionError(null);
      await services.admin.setRole(u.id, next);
      await reload();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  }

  async function remove(u: Profile) {
    if (!(await confirmAction({ title: `Hapus ${u.full_name}?`, message: 'Akun yang punya riwayat peminjaman tidak bisa dihapus.', destructive: true, confirmText: 'Hapus' }))) return;
    try {
      setActionError(null);
      await services.admin.deleteUser(u.id);
      await reload();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  }

  return (
    <Screen>
      <Header title="Pengguna" subtitle="Kelola akun dan peran" />
      <View style={{ paddingHorizontal: space.lg }}>
        <ErrorBanner message={error ?? actionError} />
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(u) => u.id}
          refreshing={refreshing}
          onRefresh={reload}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}
          ListEmptyComponent={<EmptyState title="Belum ada pengguna" />}
          renderItem={({ item: u }) => (
            <Card testID={`user-card-${u.email}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{u.full_name}{u.id === me?.id ? ' (kamu)' : ''}</Text>
                  <Text style={styles.meta}>{u.email}</Text>
                </View>
                <Badge label={u.role === 'admin' ? 'Admin' : 'User'} tone={u.role === 'admin' ? 'info' : 'neutral'} />
              </View>
              {u.id !== me?.id ? (
                <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
                  <Button small variant="secondary" title={u.role === 'admin' ? 'Jadikan User' : 'Jadikan Admin'} onPress={() => toggleRole(u)} testID={`role-${u.email}`} />
                  <Button small variant="danger" title="Hapus" onPress={() => remove(u)} testID={`delete-${u.email}`} />
                </View>
              ) : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
});
