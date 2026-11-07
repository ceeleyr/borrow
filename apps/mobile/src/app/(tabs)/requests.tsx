import { useAuth } from '@/contexts/auth-context';
import { RequestsList } from '@/features/requests-list';

export default function RequestsTab() {
  const { isAdmin } = useAuth();
  return <RequestsList admin={isAdmin} />;
}
