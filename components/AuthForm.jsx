'use client';

import { useState } from 'react';

export default function AuthForm({ authConfigured, redirectTo }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!authConfigured || busy) return;

    setBusy(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || 'Something went wrong. Try again.');
        return;
      }

      let target = redirectTo || '/dashboard';
      try {
        window.sessionStorage.setItem('SuiteRhythm_show_tester_warning', '1');
      } catch (_) {
        const url = new URL(target, window.location.origin);
        url.searchParams.set('testerNotice', '1');
        target = `${url.pathname}${url.search}${url.hash}`;
      }

      window.location.assign(target);
    } catch (error) {
      setMessage(error?.message || 'Could not reach the login service.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-field">
        <span>Username</span>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
          disabled={!authConfigured || busy}
        />
      </label>

      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={!authConfigured || busy}
        />
      </label>

      {message && <div className="auth-message" role="status">{message}</div>}
      {!authConfigured && (
        <div className="auth-message error" role="alert">
          Tester login needs an auth secret before it can run.
        </div>
      )}

      <button type="submit" className="auth-submit" disabled={!authConfigured || busy}>
        {busy ? 'Working...' : 'Sign in'}
      </button>
    </form>
  );
}
