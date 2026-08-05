/**
 * Jest environment setup.
 *
 * Native modules have no implementation under Node, so anything a unit test
 * transitively imports has to be stubbed here or the import itself throws.
 */

// config/env.js validates at import and throws when these are missing, which
// is the point of it — but it means any module transitively importing it (via
// lib/log.js, for instance) cannot be unit-tested without them. Values are
// syntactically valid and point nowhere.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
// Read at module load by config/env.js, so it has to exist before any test
// imports lib/monitoring.js. Points nowhere; the SDK itself is mocked.
process.env.EXPO_PUBLIC_SENTRY_DSN ??= 'https://testkey@o0.ingest.sentry.io/0';

// AsyncStorage ships an official in-memory mock for exactly this.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The client is constructed at import time and would try to reach the network.
// Tests that need query behaviour should mock the specific service instead.
jest.mock('./lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
    storage: { from: jest.fn() },
    auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() },
  },
}));
