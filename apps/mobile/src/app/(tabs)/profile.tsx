import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { Badge, Button, Card, ErrorBanner, Field, Header, InfoBanner, KeyValue, Screen } from '@/components/ui';
import { space } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

export default function ProfileTab() {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setError(null);
    setSaved(false);
    if (!name.trim()) return setError('Nama tidak boleh kosong');
    setSaving(true);
    try {
      await updateProfile(name);
      setSaved(true);
    } catch (e) {
      setError(getErrorMessage(e, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}>
        <Header title="Profil" />
        <Card>
          <KeyValue label="Email" value={user?.email ?? '-'} />
          <KeyValue label="Peran" value={<Badge label={user?.role === 'admin' ? 'Admin' : 'User'} tone={user?.role === 'admin' ? 'info' : 'neutral'} testID="role-badge" />} />
        </Card>
        <Card>
          <ErrorBanner message={error} />
          <InfoBanner message={saved ? 'Profil tersimpan' : null} />
          <Field label="Nama lengkap" value={name} onChangeText={(t) => { setName(t); setSaved(false); }} testID="profile-name" />
          <Button title="Simpan" onPress={save} loading={saving} testID="profile-save" />
        </Card>
        <Button title="Keluar" variant="danger" onPress={logout} testID="logout" />
      </ScrollView>
    </Screen>
  );
}
