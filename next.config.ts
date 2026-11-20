import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

// Build id for the SW cache name (spec 10): the commit SHA on Vercel, else a build timestamp.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  register: false, // lib/client registers /sw.js?v=<build id> in production only (spec 04)
  disable: process.env.NODE_ENV !== 'production',
});

const config: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  turbopack: {}, // dev runs on Turbopack; Serwist's webpack plugin is disabled outside production
};

export default withSerwist(config);
