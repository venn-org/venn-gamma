import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import OnboardingShell from '../../components/OnboardingShell';

export default function PhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, updateData, submitData } = useOnboarding();
  
  const isOwner = data.type === 'owner';
  
  const [uploading, setUploading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(data.photos?.profile || null);
  const [flatPhotos, setFlatPhotos] = useState(data.photos?.flat || [null, null, null]);

  const pickPhoto = async (setter, aspect) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // In a real app we'd upload to Firebase Storage and get a URL back here.
      // For this phase, we just store the local URI.
      setter(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    setUploading(true);
    
    // Simulate upload delay
    await new Promise(r => setTimeout(r, 600));
    
    updateData({
      photos: {
        profile: profilePhoto,
        flat: flatPhotos
      }
    });
    
    setUploading(false);
    router.push('/notifications');
  };

  const canContinue = isOwner 
    ? profilePhoto && flatPhotos.some(p => p !== null)
    : profilePhoto;

  return (
    <OnboardingShell step={8} total={9}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {isOwner ? (
          <>
            <Text style={styles.title}>Add your photos</Text>
            <Text style={styles.subtitle}>Your profile photo is shown first. Flat photos help people picture living there.</Text>

            <Text style={styles.sectionLabel}>YOUR PHOTO</Text>
            <Text style={styles.sectionNote}>Shown as your profile picture — required</Text>
            <TouchableOpacity
              style={styles.slotMain}
              onPress={() => pickPhoto(setProfilePhoto, [1, 1])}
              activeOpacity={0.8}
            >
              {profilePhoto
                ? <Image source={{ uri: profilePhoto }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} resizeMode="cover" />
                : <>
                    <Ionicons name="person-add-outline" size={32} color={colors.placeholder} />
                    <Text style={styles.slotLabel}>Add profile photo</Text>
                  </>
              }
              {profilePhoto && (
                <View style={styles.changeOverlay}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>FLAT PHOTOS</Text>
            <Text style={styles.sectionNote}>At least 1 required — show the living room, bedroom, common areas</Text>
            <View style={styles.grid}>
              {flatPhotos.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.slot}
                  onPress={() => pickPhoto(url => setFlatPhotos(prev => prev.map((x, j) => j === i ? url : x)), [4, 3])}
                  activeOpacity={0.8}
                >
                  {p
                    ? <>
                        <Image source={{ uri: p }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} resizeMode="cover" />
                        <View style={styles.changeOverlaySmall}>
                          <Ionicons name="camera-outline" size={14} color="#fff" />
                        </View>
                      </>
                    : <>
                        <Ionicons name="home-outline" size={24} color={colors.placeholder} />
                        <Text style={styles.slotLabel}>{i === 0 ? 'Main room' : i === 1 ? 'Bedroom' : 'Kitchen'}</Text>
                      </>
                  }
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.notice, { marginTop: 20 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.blue} />
              <Text style={styles.noticeText}>Flat photos are required so people can see what they're moving into.</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Add your photo</Text>
            <Text style={styles.subtitle}>Your profile photo is the first thing people see. Profiles with photos get 4× more responses.</Text>

            <TouchableOpacity
              style={styles.slotMain}
              onPress={() => pickPhoto(setProfilePhoto, [1, 1])}
              activeOpacity={0.8}
            >
              {profilePhoto
                ? <Image source={{ uri: profilePhoto }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} resizeMode="cover" />
                : <>
                    <Ionicons name="person-add-outline" size={32} color={colors.placeholder} />
                    <Text style={styles.slotLabel}>Add profile photo</Text>
                  </>
              }
              {profilePhoto && (
                <View style={styles.changeOverlay}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {uploading && (
          <View style={styles.uploadRow}>
            <ActivityIndicator size="small" color={colors.blue} />
            <Text style={styles.uploadText}>Uploading...</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, (!canContinue || uploading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || uploading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
        {!isOwner && (
          <TouchableOpacity onPress={handleContinue} disabled={uploading} style={{ marginTop: 12 }}>
            <Text style={styles.skip}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 24 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 4 },
  sectionNote: { fontSize: 12, color: colors.placeholder, marginBottom: 14 },
  optional: { fontFamily: 'System', textTransform: 'none', letterSpacing: 0, color: colors.placeholder, fontSize: 12 },

  slotMain: {
    width: '100%', height: 180, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.mist, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.canvas, marginBottom: 8, overflow: 'hidden',
  },
  slotLabel: { fontSize: 13, color: colors.placeholder, textAlign: 'center' },
  changeOverlay: {
    position: 'absolute', bottom: 10, right: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  changeOverlaySmall: {
    position: 'absolute', bottom: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    width: '31%', aspectRatio: 1, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.mist, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.canvas, overflow: 'hidden',
  },
  plus: { fontSize: 28, color: colors.placeholder, fontWeight: '300' },

  notice: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EEF1FF', borderRadius: 12, padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 },

  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'center' },
  uploadText: { fontSize: 13, color: colors.slate },

  footer: { paddingHorizontal: 0, paddingTop: 24, gap: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { fontSize: 14, color: colors.slate, textAlign: 'center' },
});
