export const metadata = {
  title: 'Terms of Service - SuiteRhythm',
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', color: '#e0e0e0', fontFamily: 'sans-serif', lineHeight: 1.7 }}>
      <h1 style={{ color: '#bb86fc' }}>Terms of Service</h1>
      <p><em>Last updated: April 2026</em></p>

      <h2>1. Acceptance</h2>
      <p>
        By accessing or using SuiteRhythm (&ldquo;the Service&rdquo;), you agree to be bound by these
        Terms of Service. If you do not agree, do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        SuiteRhythm is a reactive sound design platform for tabletop RPG sessions, storytelling,
        and content creation. The Service analyses spoken audio via your microphone (with your
        permission) and plays contextual music and sound effects from a curated library. Scene
        detection is performed by a language model.
      </p>

      <h2>3. User Responsibilities</h2>
      <ul>
        <li>You must be at least 13 years old to use the Service.</li>
        <li>You are responsible for all activity under your account.</li>
        <li>You may not share beta credentials except with people we have expressly authorized.</li>
        <li>You may not misuse, reverse-engineer, scrape, probe, scan, overload, or abuse the Service or its APIs.</li>
        <li>You may not attempt to access source code, server code, secrets, API keys, non-public endpoints, private files, or data that does not belong to you.</li>
      </ul>

      <h2>4. Private Beta Access</h2>
      <p>
        Beta access is temporary, revocable, and provided only for evaluation and feedback. Non-public
        features, workflows, implementation details, API behavior, configuration, pricing plans, and
        other information revealed during the beta are confidential unless we publish them publicly.
        You may not copy, disclose, sell, publish, mirror, benchmark for a competing product, or use
        beta access to build or improve a competing service.
      </p>

      <h2>5. Subscriptions &amp; Payments</h2>
      <p>
        SuiteRhythm is currently offered as a beta preview. Paid subscriptions may be introduced
        later with clear pricing, checkout, renewal, and cancellation terms before any charge is made.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        All sounds, code, and branding are owned by SuiteRhythm or licensed from third parties.
        You may use recordings of your own sessions, streams, and shows, but you may not redistribute
        the raw sound library or package the sounds as a competing library.
      </p>
      <p>
        SuiteRhythm does not grant you any rights to its source code, server code, build artifacts,
        prompts, models, workflows, APIs, databases, audio catalog metadata, or internal systems except
        the limited right to use the Service through its intended interface. You may not copy, extract,
        decompile, disassemble, modify, create derivative works from, publicly display, redistribute,
        sublicense, sell, or otherwise exploit any part of the source code, compiled client code, sound
        library, private documentation, or non-public technical materials.
      </p>
      <p>
        You may not bypass access controls, remove proprietary notices, harvest assets or metadata at
        scale, attempt to reconstruct the source code from client bundles, search for source maps or
        private repositories, or use automated tools to clone, scrape, copy, or monitor the Service
        except as expressly authorized in writing.
      </p>

      <h2>7. Security Testing and Abuse</h2>
      <p>
        You may not conduct vulnerability scanning, penetration testing, scraping, credential attacks,
        load testing, automated extraction, or attempts to access private information without prior
        written permission. We may suspend or revoke access, preserve logs, and take appropriate action
        if we believe the Service, source code, data, infrastructure, or other users are at risk.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranty of any kind. SuiteRhythm is not
        liable for any indirect, incidental, or consequential damages arising from use of the
        Service.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these terms at any time. Continued use after changes constitutes acceptance.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions? Email <a href="mailto:aaroncue92@gmail.com" style={{ color: '#bb86fc' }}>aaroncue92@gmail.com</a>.
      </p>

      <p style={{ marginTop: 40 }}>
        <a href="/dashboard" style={{ color: '#bb86fc' }}>&larr; Back to SuiteRhythm</a>
      </p>
    </main>
  );
}
