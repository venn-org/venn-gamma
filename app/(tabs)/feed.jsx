import { View, Text, TouchableOpacity } from 'react-native';
import { signOutUser } from '../../lib/auth';

export default function FeedScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Feed Stub (Phase 2)</Text>
      
      <TouchableOpacity 
        onPress={async () => {
          try {
            await signOutUser();
          } catch (e) {
            console.error(e);
          }
        }}
        style={{ padding: 15, backgroundColor: '#335CFF', borderRadius: 8 }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Sign Out (Test Phase 1)</Text>
      </TouchableOpacity>
    </View>
  );
}
