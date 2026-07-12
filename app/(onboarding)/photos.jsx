import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import OnboardingShell from '../../components/OnboardingShell';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function PhotosScreen() {
  const router = useRouter();
  const { state, updateField } = useOnboarding();
  const [photos, setPhotos] = useState(state.photos || []);

  const pickImage = async (index) => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to add photos.');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newPhotos = [...photos];
      newPhotos[index] = result.assets[0].uri;
      setPhotos(newPhotos);
    }
  };

  const removeImage = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleNext = () => {
    updateField('photos', photos.filter(Boolean));
    router.push('/notifications');
  };

  return (
    <OnboardingShell
      step={7}
      total={8}
      footer={
        <TouchableOpacity onPress={handleNext} disabled={photos.length === 0}>
          <LinearGradient
            colors={['#335CFF', '#8A5BFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.btn, photos.length === 0 && { opacity: 0.5 }]}
          >
            <Text style={s.btnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
    >
      <Text style={s.title}>Add your photos</Text>
      <Text style={s.sub}>Add at least 1 photo to continue. The first photo will be your main profile picture.</Text>
      
      <View style={s.grid}>
        {[0, 1, 2, 3].map((index) => {
          const uri = photos[index];
          return (
            <View key={index} style={s.slotWrap}>
              <TouchableOpacity 
                style={s.slot} 
                onPress={() => pickImage(index)}
                activeOpacity={0.8}
              >
                {uri ? (
                  <Image source={{ uri }} style={s.image} />
                ) : (
                  <Ionicons name="add" size={32} color={colors.placeholder} />
                )}
              </TouchableOpacity>
              
              {uri && (
                <TouchableOpacity style={s.deleteBtn} onPress={() => removeImage(index)}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, marginBottom: 8, letterSpacing: -1 },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, color: colors.slate, marginBottom: 32, lineHeight: 22 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  slotWrap: { width: '48%', aspectRatio: 3/4, position: 'relative' },
  slot: { flex: 1, backgroundColor: colors.mist, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderStyle: 'dashed', borderColor: '#D0D3DE' },
  image: { width: '100%', height: '100%' },
  
  deleteBtn: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.paper },
  
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
