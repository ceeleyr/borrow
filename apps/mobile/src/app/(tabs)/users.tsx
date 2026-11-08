import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { services } from '@/services/client';
import { useAuth } from '@/contexts/auth-context';
import type { Profile } from '@/services/types';
import type { Role } from '@/lib/status';
import { Badge, Button, Card, EmptyState, ErrorBanner, Header, Loading, Screen } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { confirmAction } from '@/lib/dialog';
import { getErrorMessage } from '@/lib/errors';
import { useLoad } from '@/hooks/use-load';

export default function UsersTab() {
  const { isSuperAdmin, user: me } = useAuth();
  const { data, loading, refreshing, error, reload } = useLoad(
    () => (isSuperAdmin ? services.admin.users() : Promise.resolve([])),
    [isSuperAdmin]
  );
  const [actionError, setActionError] = useState<string | null>(null);

  // Hanya Superadmin yang boleh mengakses tab ini
  if (!isSuperAdmin) return <Redirect href="/" />;

  async function changeRole(u: Profile, newRole: Role) {
    const roleLabel = newRole === 'superadmin' ? 'Superadmin' : newRole === 'admin' ? 'Admin' : 'User';
    if (!(await confirmAction({ title: `Ubah peran ${u.full_name} menjadi ${roleLabel}?` }))) return;
    try {
      setActionError(null);
      await services.admin.setRole(u.id, newRole);
      await reload();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  }

  async function remove(u: Profile) {
    if (
      !(await confirmAction({
        title: `Hapus ${u.full_name}?`,
        message: 'Akun yang punya riwayat peminjaman tidak bisa dihapus.',
        destructive: true,
        confirmText: 'Hapus',
      }))
    )
      return;
    try {
      setActionError(null);
      await services.admin.deleteUser(u.id);
      await reload();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  }

  function roleBadgeInfo(role: Role) {
    if (role === 'superadmin') return { label: 'Superadmin', tone: 'success' as const };
    if (role === 'admin') return { label: 'Admin', tone: 'info' as const };
    return { label: 'User', tone: 'neutral' as const };
  }

  return (
    <Screen>
      <Header title="Kelola Pengguna" subtitle="Fitur Superadmin: kelola akun dan peran" />
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
          renderItem={({ item: u }) => {
            const badge = roleBadgeInfo(u.role);
            const isSelf = u.id === me?.id;
            return (
              <Card testID={`user-card-${u.email}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {u.full_name}
                      {isSelf ? ' (kamu)' : ''}
                    </Text>
                    <Text style={styles.meta}>{u.email}</Text>
                  </View>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>
                {!isSelf ? (
                  <View style={{ marginTop: space.md }}>
                    <Text style={styles.actionLabel}>Ubah Peran / Aksi:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: 4 }}>
                      {u.role !== 'user' && (
                        <Button
                          small
                          variant="secondary"
                          title="Set User"
                          onPress={() => changeRole(u, 'user')}
                          testID={`set-user-${u.email}`}
                        />
                      )}
                      {u.role !== 'admin' && (
                        <Button
                          small
                          variant="secondary"
                          title="Set Admin"
                          onPress={() => changeRole(u, 'admin')}
                          testID={`set-admin-${u.email}`}
                        />
                      )}
                      {u.role !== 'superadmin' && (
                        <Button
                          small
                          variant="secondary"
                          title="Set Superadmin"
                          onPress={() => changeRole(u, 'superadmin')}
                          testID={`set-superadmin-${u.email}`}
                        />
                      )}
                      <Button
                        small
                        variant="danger"
                        title="Hapus"
                        onPress={() => remove(u)}
                        testID={`delete-${u.email}`}
                      />
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  actionLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 2 },
});
