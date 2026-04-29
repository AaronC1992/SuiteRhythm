'use client';

import { useEffect, useRef, useState } from 'react';

const WARNING_FLAG = 'SuiteRhythm_show_tester_warning';

export default function BetaTesterWarning({ user }) {
  const [open, setOpen] = useState(false);
  const acknowledgeRef = useRef(null);

  useEffect(() => {
    if (!user?.freeAccess || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    let shouldShow = params.get('testerNotice') === '1';

    try {
      shouldShow = shouldShow || window.sessionStorage.getItem(WARNING_FLAG) === '1';
      if (params.get('testerNotice') === '1') window.sessionStorage.setItem(WARNING_FLAG, '1');
    } catch (_) {}

    if (params.get('testerNotice') === '1') {
      params.delete('testerNotice');
      const cleanQuery = params.toString();
      const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', cleanUrl);
    }

    if (shouldShow) setOpen(true);
  }, [user?.freeAccess]);

  useEffect(() => {
    if (!open) return;
    acknowledgeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const acknowledge = () => {
    try { window.sessionStorage.removeItem(WARNING_FLAG); } catch (_) {}
    setOpen(false);
  };

  return (
    <div className="tester-warning-backdrop" role="presentation">
      <section
        className="tester-warning-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tester-warning-title"
        aria-describedby="tester-warning-body"
      >
        <p className="tester-warning-kicker">Private tester access</p>
        <h2 id="tester-warning-title">Do not copy, extract, or misuse SuiteRhythm.</h2>
        <div id="tester-warning-body" className="tester-warning-body">
          <p>
            This free tester login is temporary and confidential. Use SuiteRhythm only through the
            intended app interface.
          </p>
          <ul>
            <li>Do not copy, extract, reverse-engineer, scrape, clone, or redistribute the app, source code, client bundles, prompts, API behavior, or sound library.</li>
            <li>Do not attempt to access server files, secrets, API keys, private repositories, non-public endpoints, or another person&apos;s data.</li>
            <li>Tester access can be revoked, and activity may be logged to protect the service.</li>
          </ul>
        </div>
        <button ref={acknowledgeRef} type="button" className="tester-warning-accept" onClick={acknowledge}>
          I understand
        </button>
      </section>
    </div>
  );
}