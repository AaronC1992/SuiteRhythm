import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthForm from '../../components/AuthForm';
import { getAuthState, isAuthConfigured, safeRedirectPath } from '../../lib/auth.js';

export const metadata = {
  title: 'Sign in - SuiteRhythm',
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(params?.redirect || '/dashboard');
  const authState = await getAuthState();

  if (authState.user) redirect(redirectTo);
  if (authState.needsRefresh) redirect(`/api/auth/refresh?redirect=${encodeURIComponent(redirectTo)}`);

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <Link href="/" className="auth-brand">SuiteRhythm</Link>
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-copy">
            <p className="auth-kicker">Private beta</p>
            <h1 id="auth-title">Sign in to SuiteRhythm</h1>
            <p>
              Access is limited to the current free tester account while SuiteRhythm is in private testing.
            </p>
          </div>
          <AuthForm
            authConfigured={isAuthConfigured()}
            redirectTo={redirectTo}
          />
          {params?.expired && (
            <p className="auth-footnote">Your session expired. Sign in again to keep testing.</p>
          )}
        </section>
      </div>
    </main>
  );
}
