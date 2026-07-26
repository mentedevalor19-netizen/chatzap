import { ProtectedRoute } from '@/components/auth/protected-route';
import { CrmShell } from '@/components/chat/crm-shell';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <CrmShell />
    </ProtectedRoute>
  );
}
