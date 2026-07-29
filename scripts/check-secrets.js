#!/usr/bin/env node
/**
 * Fails if anything that must stay server-side appears in code that ships in
 * the client bundle.
 *
 * Expo inlines every `process.env.EXPO_PUBLIC_*` reference into the JS bundle,
 * so those values are public by construction — the anon key is fine there, a
 * service_role key or a JWT secret is not. Review catches this most of the
 * time; CI catches it every time.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'lib', 'hooks', 'services', 'config'];

// Patterns that should never appear in bundled source.
//
// These deliberately match *credential-shaped* text rather than the bare words:
// config/env.js has to name `service_role` to detect it at startup, and a check
// that fires on its own guard is a check nobody keeps.
const FORBIDDEN = [
  {
    re: /(SUPABASE_)?SERVICE_ROLE(_KEY)?\s*[:=]|serviceRoleKey\s*[:=]|service_role_key/i,
    why: 'service_role key must never reach the client bundle',
  },
  {
    re: /EXPO_PUBLIC_[A-Z_]*(SERVICE|SECRET|PRIVATE)/i,
    why: 'secrets must not use the EXPO_PUBLIC_ prefix (it is inlined into the bundle)',
  },
  { re: /SUPABASE_SERVICE_KEY|SUPABASE_JWT_SECRET/i, why: 'server-only Supabase credential' },
  // A raw JWT literal (two base64 segments starting `eyJ`, then a signature).
  { re: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\./, why: 'hardcoded JWT — use env vars' },
];

const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      walk(full);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      const src = fs.readFileSync(full, 'utf8');
      for (const { re, why } of FORBIDDEN) {
        if (re.test(src)) {
          failures.push(`${path.relative(ROOT, full)}: ${why}`);
        }
      }
    }
  }
}

SCAN_DIRS.forEach((d) => walk(path.join(ROOT, d)));

// .env must never be committed, whatever .gitignore currently says.
if (fs.existsSync(path.join(ROOT, '.env'))) {
  const { execSync } = require('child_process');
  try {
    const tracked = execSync('git ls-files .env', { cwd: ROOT }).toString().trim();
    if (tracked) failures.push('.env is tracked by git — remove it from the index');
  } catch {
    /* not a git checkout; nothing to verify */
  }
}

if (failures.length) {
  console.error('Secret check failed:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log('Secret check passed.');
