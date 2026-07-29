/**
 * Jest environment setup.
 *
 * Native modules have no implementation under Node, so anything a unit test
 * transitively imports has to be stubbed here or the import itself throws.
 */

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
