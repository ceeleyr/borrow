import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return <AppTabs />;
}