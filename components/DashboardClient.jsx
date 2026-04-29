'use client';

import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('./AppShell'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#8a2be2',
        fontFamily: 'sans-serif',
        fontSize: '1.1rem',
      }}
    >
      Loading SuiteRhythm...
    </div>
  ),
});

export default function DashboardClient({ user }) {
  return <AppShell user={user} />;
}
