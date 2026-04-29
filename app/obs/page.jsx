import { redirect } from 'next/navigation';
import ObsClient from '../../components/ObsClient';
import { getAuthState, loginPath } from '../../lib/auth.js';

export const dynamic = 'force-dynamic';

/**
 * OBS Browser Source page — a minimal, transparent-background wrapper
 * that runs the SuiteRhythm engine for audio capture by OBS Studio.
 *
 * Usage: Add this URL as a Browser Source in OBS:
 *   https://your-domain.com/obs
 *
 * The page has a transparent background so it can overlay scenes.
 * Only the currently-playing sounds list and status text are shown.
 */
export default async function ObsPage() {
  const authState = await getAuthState();

  if (authState.needsRefresh) {
    redirect('/api/auth/refresh?redirect=/obs');
  }

  if (!authState.user) {
    redirect(loginPath('/obs'));
  }

  return <ObsClient />;
}
