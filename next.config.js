/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'serial=()',
      'bluetooth=()',
      'microphone=(self)',
      'clipboard-read=(self)',
      'clipboard-write=(self)',
    ].join(', '),
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https: data:",
      "connect-src 'self' https://plausible.io https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.elevenlabs.io https://pixabay.com https://pixabay.com/api/ https://*.r2.cloudflarestorage.com https://*.r2.dev https://irc-ws.chat.twitch.tv wss://irc-ws.chat.twitch.tv wss://irc-ws.chat.twitch.tv:443",
      "font-src 'self'",
      "worker-src 'self' blob:",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const privateRouteHeaders = [
  { key: 'Cache-Control', value: 'no-store, max-age=0' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
];

const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['ffmpeg-static'],

  // Allow importing the Howler audio library which uses browser globals
  // eslint-disable-next-line no-unused-vars
  webpack(config, { isServer }) {
    if (isServer) {
      // Howler and audio APIs are browser-only – mark as false so Webpack
      // replaces imports with an empty module instead of referencing a
      // non-existent global (the 'Howl' global does not exist server-side).
      config.externals = [
        ...(config.externals || []),
        { howler: false },
      ];
    }
    return config;
  },

  // Proxy R2 audio through Next.js to avoid CORS issues with pub-*.r2.dev
  async rewrites() {
    const r2Base = process.env.R2_PUBLIC_URL || 'https://pub-b8fe695f5b4b490ebe0dc151042193e2.r2.dev';
    return [
      {
        source: '/r2-audio/:path*',
        destination: `${r2Base}/:path*`,
      },
      {
        source: '/Saved%20sounds/:path*',
        destination: `${r2Base}/Saved%20sounds/:path*`,
      },
      {
        source: '/Saved sounds/:path*',
        destination: `${r2Base}/Saved%20sounds/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/login',
        headers: privateRouteHeaders,
      },
      {
        source: '/dashboard',
        headers: privateRouteHeaders,
      },
      {
        source: '/obs',
        headers: privateRouteHeaders,
      },
    ];
  },
};

export default nextConfig;
