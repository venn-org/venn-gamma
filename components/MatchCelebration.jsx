import { View, Text } from 'react-native';

export default function MatchCelebration({ visible, matchedName, matchedPhoto, onChat, onDismiss }) {
  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: 'white' }}>Match Celebration Placeholder</Text>
    </View>
  );
}
