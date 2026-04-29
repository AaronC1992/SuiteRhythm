import { redirect } from 'next/navigation';
import DashboardClient from '../../components/DashboardClient';
import { getAuthState, loginPath, publicUser } from '../../lib/auth.js';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const authState = await getAuthState();

  if (authState.needsRefresh) {
    redirect('/api/auth/refresh?redirect=/dashboard');
  }

  if (!authState.user) {
    redirect(loginPath('/dashboard'));
  }

  return <DashboardClient user={publicUser(authState.user)} />;
}
