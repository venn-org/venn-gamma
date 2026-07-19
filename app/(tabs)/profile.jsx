import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId, signOutUser } from '../../lib/auth';
import { mapDbPrefsToUI, mapUIPrefsToDb } from '../../lib/enums';
import { calculateProfileCompletion } from '../../lib/profileUtils';
import PreferencesSheet from '../../components/PreferencesSheet';

const SettingsRow = ({ icon, iconBg, iconColor, title, titleColor, subtitle, subtitleColor, last, right, onPress }) => (
  <TouchableOpacity style={[s.settingsRow, !last && s.settingsRowBorder]} onPress={onPress} activeOpacity={0.7} disabled={!onPress && !right}>
    <View style={[s.settingsIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[s.settingsTitle, titleColor && { color: titleColor }]}>{title}</Text>
      {subtitle ? <Text style={[s.settingsSub, subtitleColor && { color: subtitleColor }]}>{subtitle}</Text> : null}
    </View>
    {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color="#C0C5D0" /> : null)}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [profile, setProfile] = useState(null);
  const [incognito, setIncognito] = useState(false);
  const [prefsVisible, setPrefsVisible] = useState(false);
  const [userPrefs, setUserPrefs] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      setProfile(data);
      setIncognito(!!data.paused);
      setUserPrefs(mapDbPrefsToUI(data));
    }
  };

  const toggleIncognito = async (val) => {
    setIncognito(val);
    const uid = getCurrentUserId();
    if (!uid) return;
    await supabase.from('profiles').update({ paused: val }).eq('id', uid);
  };

  const handleSavePrefs = async (newPrefs) => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setUserPrefs(newPrefs);
    const updates = mapUIPrefsToDb(newPrefs);
    await supabase.from('profiles').update(updates).eq('id', uid);
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await signOutUser();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => {
          await signOutUser();
        }}
      ]);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This will permanently delete your profile, matches, and chats. This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('delete_account');
        if (error) {
          Alert.alert('Error', 'Failed to delete account.');
        } else {
          await signOutUser();
        }
      }}
    ]);
  };

  const name = profile?.name || 'User';
  const photo = profile?.photos?.[0] || null;
  const initials = name.charAt(0).toUpperCase();

  const { percentage } = calculateProfileCompletion(profile);
  const size = 84;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.topBar}>
        <Text style={s.title}>Profile</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header Profile Info */}
        <View style={s.headerWrap}>
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={size/2} cy={size/2} r={radius} stroke="#EEF0FF" strokeWidth={strokeWidth} fill="transparent" />
              <Circle cx={size/2} cy={size/2} r={radius} stroke="#335CFF" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
            </Svg>
            <TouchableOpacity activeOpacity={0.8} style={{ width: 72, height: 72, position: 'relative' }}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ position: 'absolute', inset: 0, borderRadius: 36 }} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', inset: 0, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: '#fff' }}>{initials}</Text>
                </LinearGradient>
              )}
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={s.profileName}>{name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.profileRole}>{profile?.user_type === 'owner' ? 'Owner' : 'Seeking'}</Text>
              <View style={s.dot} />
              <Text style={s.completionText}>{percentage}% Complete</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 24 }}>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.85} onPress={() => router.push('/(settings)/edit-profile')}>
            <View style={[s.actionIcon, { backgroundColor: '#F3EEFF' }]}>
              <Ionicons name="pencil" size={18} color="#8A5BFF" />
            </View>
            <Text style={s.actionText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.85} onPress={() => setPrefsVisible(true)}>
            <View style={[s.actionIcon, { backgroundColor: '#EEF0FF' }]}>
              <Ionicons name="settings" size={18} color="#335CFF" />
            </View>
            <Text style={s.actionText}>Preferences</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <View style={s.settingsGroup}>
            <SettingsRow
              icon="eye-off" iconBg="#F2F3F7" iconColor="#5A6072"
              title="Incognito Mode" subtitle="Hide profile from discovery"
              right={<Switch value={incognito} onValueChange={toggleIncognito} trackColor={{ true: colors.blue, false: '#E6E8EE' }} />}
              last
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>SUPPORT & LEGAL</Text>
          <View style={s.settingsGroup}>
            <SettingsRow icon="help-buoy" iconBg="#EEFCF3" iconColor="#22C55E" title="Help Center" onPress={() => router.push('/(settings)/help-center')} />
            <SettingsRow icon="shield-checkmark" iconBg="#EEF1FF" iconColor="#335CFF" title="Safety Center" onPress={() => router.push('/(settings)/safety-center')} />
            <SettingsRow icon="document-text" iconBg="#F2F3F7" iconColor="#9AA0B2" title="Terms & Privacy" onPress={() => router.push('/(settings)/terms')} last />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>DANGER ZONE</Text>
          <View style={s.settingsGroup}>
            <SettingsRow
              icon="log-out" iconBg="#FFF0F3" iconColor="#FF4D6A"
              title="Log Out" titleColor="#FF4D6A"
              onPress={handleSignOut}
              last
            />
          </View>
        </View>
      </ScrollView>

      <PreferencesSheet
        visible={prefsVisible}
        prefs={userPrefs}
        onClose={() => setPrefsVisible(false)}
        onSave={handleSavePrefs}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },

  headerWrap: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, marginBottom: 20 },
  profileName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.ink, marginBottom: 4, letterSpacing: -0.5 },
  profileRole: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 0.8 },
  completionText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D0D4DF' },

  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.ink },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 10 },
  settingsGroup: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EDEEF2' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  settingsIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink },
  settingsSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginTop: 2 },
});
