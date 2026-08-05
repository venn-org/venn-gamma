#!/usr/bin/env node
/**
 * Uploads the web build's source maps to Sentry.
 *
 * Without this, a production stack trace reads `index-a3f9.js:1:284713` — the
 * error is recorded but tells you nothing, which is most of the value of
 * having error reporting at all.
 *
 * Runs as part of `npm run build`, which is what Vercel executes (see
 * vercel.json → buildCommand and docs/CICD.md — the web build goes through
 * Vercel's git integration, not .github/workflows/deploy.yml). Credentials
 * therefore come from Vercel's project env vars, not GitHub Actions secrets.
 *
 * Skips rather than fails when unconfigured: a contributor running
 * `npm run build` locally has no Sentry token and should still get a build.
 */
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');

const DIST = 'dist';

if (!process.env.SENTRY_AUTH_TOKEN) {
  console.log('[sentry] SENTRY_AUTH_TOKEN not set — skipping source map upload.');
  process.exit(0);
}

if (!existsSync(DIST)) {
  console.error(`[sentry] no ${DIST}/ directory — did the export step run?`);
  process.exit(1);
}

// Tags the upload with the commit, so a Sentry issue links to the exact code.
// Vercel exposes the SHA under its own name; fall back to git for local runs.
const commit =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout?.trim();

const result = spawnSync(
  'npx',
  ['sentry-expo-upload-sourcemaps', DIST, ...(commit ? ['--release', commit] : [])],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

if (result.status !== 0) {
  // Deliberately non-fatal. A Sentry outage or an expired token should not be
  // able to block a deploy of working code — the cost is one release with
  // unreadable traces, which is strictly better than not shipping.
  console.warn('[sentry] source map upload failed; continuing with the build.');
}
