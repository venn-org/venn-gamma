/**
 * Dynamic Expo config.
 *
 * `app.json` stays the static base — Expo passes it in as `config` — and this
 * file layers on everything that has to be computed at build time, which a
 * static JSON file cannot do:
 *
 *   - per-environment app identity, so a preview build installs alongside
 *     production instead of overwriting it;
 *   - `runtimeVersion`, which OTA updates key off;
 *   - `extra`, readable at runtime via expo-constants.
 *
 * Select an environment with APP_ENV=preview|production (defaults to
 * development).
 */
const APP_ENV = process.env.APP_ENV ?? 'development';

const VARIANTS = {
  // Development deliberately keeps production's identifier and scheme: the
  // `venn://` redirect is the one already allow-listed in the Supabase and
  // Google consoles, and a dev-only scheme would break Google sign-in on
  // every machine until someone registered it. Give development its own
  // identity only once that registration exists.
  development: {
    name: 'Vennflat (Dev)',
    bundleSuffix: '',
    scheme: 'venn',
  },
  preview: {
    name: 'Vennflat (Preview)',
    bundleSuffix: '.preview',
    scheme: 'venn',
  },
  production: {
    name: 'Vennflat',
    bundleSuffix: '',
    scheme: 'venn',
  },
};

const variant = VARIANTS[APP_ENV] ?? VARIANTS.development;

module.exports = ({ config }) => ({
  ...config,
  name: variant.name,
  // The OAuth deep link is registered against this scheme, so a variant with
  // its own scheme needs its own redirect URL allow-listed in the Supabase
  // dashboard. Production keeps `venn`, which is what is already configured.
  scheme: variant.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: `${config.ios.bundleIdentifier}${variant.bundleSuffix}`,
  },
  android: {
    ...config.android,
    package: `${config.android.package}${variant.bundleSuffix.replace(/\./g, '')}`,
  },
  // Native code changes with the SDK, not with every JS release: an OTA update
  // is only safe for builds sharing this value.
  runtimeVersion: { policy: 'appVersion' },
  extra: {
    ...config.extra,
    appEnv: APP_ENV,
    // Surfaced in-app (settings/debug) so a bug report identifies its build.
    commitSha: process.env.EAS_BUILD_GIT_COMMIT_HASH ?? null,
  },
});
