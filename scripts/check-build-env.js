#!/usr/bin/env node
/**
 * Fails an EAS build that has no Supabase config, before it produces a binary.
 *
 * config/env.js throws when EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY are missing —
 * and it throws at *module import*, which on a release build means the app dies
 * between the splash screen and the first render, with no error boundary
 * mounted to catch it. The build itself succeeds, the APK installs, and the
 * failure only shows up on a tester's phone as a blank screen.
 *
 * Expo inlines EXPO_PUBLIC_* at bundle time, so whatever is set when the
 * bundler runs on the EAS worker is what ships. This runs as the
 * `eas-build-pre-install` hook so a missing value fails the build in the first
 * few seconds with a message naming the fix.
 *
 * Development builds are exempt: a dev client loads JS from a developer's
 * machine at runtime and reads their local .env then, so nothing needs to be
 * baked into that binary.
 */
const REQUIRED = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

const appEnv = process.env.APP_ENV ?? 'development';

if (appEnv === 'development') {
  console.log(
    `[check-build-env] APP_ENV=development — skipping (dev client reads .env at runtime).`,
  );
  process.exit(0);
}

const missing = REQUIRED.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(
    `\n[check-build-env] Missing required build-time environment variable(s):\n` +
      missing.map((n) => `  - ${n}`).join('\n') +
      `\n\nThese are inlined into the JS bundle, so a build without them ships an\n` +
      `app that crashes on launch. Set them on the EAS project, then rebuild:\n\n` +
      `  eas env:create --name EXPO_PUBLIC_SUPABASE_URL --scope project --visibility plaintext\n` +
      `  eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --scope project --visibility plaintext\n\n` +
      `Verify with \`eas env:list\`. See README → Setup for where the values come from.\n`,
  );
  process.exit(1);
}

console.log(`[check-build-env] APP_ENV=${appEnv}: all required variables present.`);
