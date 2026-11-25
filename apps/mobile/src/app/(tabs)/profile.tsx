import { ScrollView } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { Badge, Button, Card, Header, KeyValue, Screen } from '@/components/ui';
import { space } from '@/constants/theme';
import { ProfileForm } from '@/features/profile-form';

export default function ProfileTab() {
  const { user, updateProfile, logout } = useAuth();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}>
        <Header title="Profil" />
        <Card>
          <KeyValue label="Email" value={user?.email ?? '-'} />
          <KeyValue label="Peran" value={<Badge label={user?.role === 'admin' ? 'Admin' : 'User'} tone={user?.role === 'admin' ? 'info' : 'neutral'} testID="role-badge" />} />
        </Card>
        <Card>
          <ProfileForm key={user?.id} initialName={user?.full_name ?? ''} onSave={updateProfile} />
        </Card>
        <Button title="Keluar" variant="danger" onPress={logout} testID="logout" />
      </ScrollView>
    </Screen>
  );
}
