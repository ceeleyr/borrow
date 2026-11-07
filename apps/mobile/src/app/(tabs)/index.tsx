import { useAuth } from '@/contexts/auth-context';
import { Dashboard } from '@/features/dashboard';
import { ItemList } from '@/features/item-list';

export default function HomeTab() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Dashboard /> : <ItemList admin={false} />;
}
