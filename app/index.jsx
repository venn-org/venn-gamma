import { View } from 'react-native';

// Root index defers routing to _layout.jsx auth guard to avoid redirect flicker.
// The auth guard will router.replace() based on actual auth state once it's known.
// Must render a real element (not null) — expo-router's navigation container
// needs a mounted view here, otherwise its internal StoreContext crashes.
export default function Index() {
  return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
}
