import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

// The plain text version read as a caption and got skipped. A tinted pill with
// an eye icon makes it obvious this answer ends up public on the profile.
export default function VisibleOnProfileBadge({ label = 'Visible on profile', style }) {
  return (
    <View style={[styles.badge, style]}>
      <Ionicons name="eye-outline" size={13} color={colors.blue} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF1FF',
    borderWidth: 1,
    borderColor: 'rgba(51,92,255,0.22)',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  text: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.blue,
    textTransform: 'uppercase',
  },
});
