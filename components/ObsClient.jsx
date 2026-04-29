'use client';

import dynamic from 'next/dynamic';

const ObsShell = dynamic(() => import('./ObsShell'), {
  ssr: false,
  loading: () => null,
});

export default function ObsClient() {
  return <ObsShell />;
}
