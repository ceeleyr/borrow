import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { ItemList } from '@/features/item-list';

export default function ItemsTab() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect href="/" />;
  return <ItemList admin />;
}
