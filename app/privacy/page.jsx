export const metadata = {
  title: 'Privacy Policy - SuiteRhythm',
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', color: '#e0e0e0', fontFamily: 'sans-serif', lineHeight: 1.7 }}>
      <h1 style={{ color: '#bb86fc' }}>Privacy Policy</h1>
      <p><em>Last updated: April 2026</em></p>

      <h2>1. What We Collect</h2>
      <ul>
        <li>
          <strong>Microphone audio:</strong> Processed locally in your browser via the Web Speech
          API. Raw audio is <em>never</em> sent to our servers. Only the resulting text transcript
          is sent to our API for scene analysis.
        </li>
        <li>
          <strong>Transcripts:</strong> Sent to our server-side API for scene analysis using a
          language model. Not stored permanently &mdash; used only for the duration of the request.
        </li>
        <li>
          <strong>Account and access data:</strong> Tester username, session status, and access
          status during beta. Email address and subscription status may be collected if you create
          an account or join a future paid plan.
        </li>
        <li>
          <strong>Local storage:</strong> Preferences, scene presets, and custom sounds are stored
          in your browser&rsquo;s localStorage. We do not access this data.
        </li>
      </ul>

      <h2>2. How We Use Data</h2>
      <ul>
        <li>Transcripts are forwarded to OpenAI for context analysis and sound selection.</li>
        <li>We do not sell or share personal data with third parties for marketing.</li>
        <li>Anonymous usage metrics may be collected to improve the Service.</li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <ul>
        <li><strong>OpenAI:</strong> Processes transcripts. Subject to <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#bb86fc' }}>OpenAI&rsquo;s Privacy Policy</a>.</li>
        <li><strong>Payments:</strong> No live payment processor is active in the beta. If paid plans are introduced, the payment provider will be disclosed before checkout.</li>
        <li><strong>Supabase:</strong> Stores account and story data.</li>
        <li><strong>Cloudflare R2:</strong> Hosts sound files.</li>
      </ul>

      <h2>4. Data Retention</h2>
      <p>
        Transcripts are ephemeral and not persisted after the API response. Account data is
        retained while your account is active. You may request deletion at any time.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal data by contacting
        us. If you are in the EU, you have rights under GDPR including data portability and the
        right to object to processing.
      </p>

      <h2>6. Security</h2>
      <p>
        API keys are stored server-side only. All communication uses HTTPS. We follow industry
        best practices to protect your data.
      </p>
      <p>
        Tester access does not authorize anyone to probe, scan, scrape, reverse-engineer, or attempt
        to access private source code, secrets, server files, API keys, private repositories, internal
        systems, or another person&rsquo;s data. We may use logs and security telemetry to detect misuse,
        protect the Service, investigate abuse, and revoke access when necessary.
      </p>

      <h2>7. Confidential Beta Materials</h2>
      <p>
        Private beta features, implementation details, non-public APIs, unreleased workflows, and
        internal technical materials are confidential. Privacy-related requests are welcome, but beta
        access does not grant permission to copy, extract, publish, or redistribute source code,
        assets, internal documentation, prompts, API behavior, or private technical information.
      </p>

      <h2>8. Contact</h2>
      <p>
        Privacy questions? Email <a href="mailto:aaroncue92@gmail.com" style={{ color: '#bb86fc' }}>aaroncue92@gmail.com</a>.
      </p>

      <p style={{ marginTop: 40 }}>
        <a href="/dashboard" style={{ color: '#bb86fc' }}>&larr; Back to SuiteRhythm</a>
      </p>
    </main>
  );
}
