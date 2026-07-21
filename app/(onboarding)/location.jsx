import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import { findZoneByGPS } from '../../lib/locations';
import OnboardingShell from '../../components/OnboardingShell';

export default function LocationScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();

  const [locating, setLocating] = useState(true);
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);

  // Auto-request GPS on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    setLocating(true);
    setBlocked(false);
    setOutOfArea(false);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        // Once denied, browsers won't show the permission prompt again on retry —
        // the user has to flip it in browser/site (or OS) settings instead.
        // Note: expo-location's web shim always reports canAskAgain: true even
        // after a real denial, so on web we treat any denial as "blocked".
        if (perm.canAskAgain === false || Platform.OS === 'web') {
          setBlocked(true);
        } else {
          Alert.alert('Permission needed', 'We need your location to set your flat address. Enable location access to continue.');
        }
        setLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;

      // Find zone silently (backend only storage)
      const detectedZone = findZoneByGPS(data.city, latitude, longitude);
      if (detectedZone) {
        setZone({ ...detectedZone, lat: latitude, lng: longitude });
      } else {
        setOutOfArea(true);
      }
    } catch (e) {
      console.error('GPS error:', e);
      Alert.alert('Location error', 'Could not get your location. Please enable location and try again.');
    } finally {
      setLocating(false);
    }
  };

  const handleContinue = async () => {
    if (!zone) return;
    setLoading(true);
    // Store GPS + zone; never displayed, only used for backend matching
    updateData({ zone: zone.id, lat: zone.lat, lng: zone.lng });
    setLoading(false);
    router.push('/(onboarding)/preferences');
  };

  return (
    <OnboardingShell
      step={4} total={9}
      footer={
        zone && (
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? 'Saving…' : 'Continue'}</Text>
          </TouchableOpacity>
        )
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.title}>Your flat location</Text>
        <Text style={styles.subtitle}>We use this to match you with people looking nearby. Your exact location stays private.</Text>

        {locating ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.blue} />
            <Text style={styles.locatingText}>Getting your location…</Text>
          </View>
        ) : zone ? (
          <View style={styles.confirmBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
              <Text style={styles.confirmLabel}>Location detected</Text>
            </View>
            <Text style={styles.zoneName}>{zone.name}</Text>
            <Text style={styles.zoneNote}>Your exact GPS will stay private and only used for matching.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={requestLocation} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={colors.blue} />
              <Text style={styles.retryText}>Recapture location</Text>
            </TouchableOpacity>
          </View>
        ) : outOfArea ? (
          <View style={styles.centerContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={32} color="#FF4D6A" />
            </View>
            <Text style={styles.errorText}>Outside our service area</Text>
            <Text style={styles.blockedNote}>We couldn't match your location to a covered area in {data.city || 'your city'}.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={requestLocation} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={colors.blue} />
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : blocked ? (
          <View style={styles.centerContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={32} color="#FF4D6A" />
            </View>
            <Text style={styles.errorText}>Location access is blocked</Text>
            <Text style={styles.blockedNote}>
              {Platform.OS === 'web'
                ? "Your browser won't ask again automatically. Enable location for this site in your browser's settings, then retry."
                : 'Enable location access for this app in your device settings, then retry.'}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => (Platform.OS === 'web' ? requestLocation() : Linking.openSettings())}
              activeOpacity={0.8}
            >
              <Ionicons name={Platform.OS === 'web' ? 'refresh' : 'settings-outline'} size={16} color={colors.blue} />
              <Text style={styles.retryText}>{Platform.OS === 'web' ? 'Try again' : 'Open settings'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={32} color="#FF4D6A" />
            </View>
            <Text style={styles.errorText}>Couldn't get your location</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={requestLocation} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={colors.blue} />
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },

  centerContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  locatingText: { fontSize: 14, color: colors.slate, marginTop: 16 },

  confirmBox: {
    backgroundColor: '#F0FFF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBDF7F',
    padding: 20,
  },
  confirmLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#22C55E', marginLeft: 10 },
  zoneName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: colors.ink, marginBottom: 8, letterSpacing: -0.5 },
  zoneNote: { fontSize: 12, color: colors.slate, lineHeight: 18, marginBottom: 16 },

  errorIcon: { marginBottom: 16 },
  errorText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: '#FF4D6A', marginBottom: 8 },
  blockedNote: { fontSize: 13, color: colors.slate, lineHeight: 19, textAlign: 'center', marginBottom: 20, paddingHorizontal: 12 },

  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#EEF1FF', borderRadius: 12, alignSelf: 'center' },
  retryText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },

  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
