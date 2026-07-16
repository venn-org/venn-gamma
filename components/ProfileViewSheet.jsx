import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileViewSheet({ visible, profile, onClose }) {
  const insets = useSafeAreaInsets();
  if (!profile) return null;

  const photo = Array.isArray(profile.photos) && profile.photos.length > 0 ? profile.photos[0] : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={[s.sheet, { paddingTop: 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={s.handle} />
          
          <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
            {photo ? (
              <Image source={{ uri: photo }} style={s.heroPhoto} resizeMode="cover" />
            ) : (
              <View style={[s.heroPhoto, { backgroundColor: '#1A1C24', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={60} color="#333" />
              </View>
            )}

            <View style={s.infoSection}>
              <Text style={s.name}>{profile.name || 'User'}</Text>
              <Text style={s.role}>{profile.user_type === 'owner' ? 'Has a flat' : 'Looking for a flat'}</Text>
            </View>
          </ScrollView>

          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.btnPass]} onPress={onClose}>
              <Ionicons name="close" size={24} color="#FF4D6A" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnLike]} onPress={onClose}>
              <Ionicons name="heart" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '95%' },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  heroPhoto: { width: '100%', height: 400, borderRadius: 20, marginBottom: 16 },
  infoSection: { paddingHorizontal: 16, marginBottom: 20 },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: '#fff', marginBottom: 4 },
  role: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: '#9AA0B2' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#222' },
  btn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  btnPass: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  btnLike: { backgroundColor: '#335CFF' },
});
