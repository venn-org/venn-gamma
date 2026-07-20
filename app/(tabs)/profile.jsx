import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Switch, Alert, Platform, Modal, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId, signOutUser } from '../../lib/auth';
import { mapDbPrefsToUI, mapUIPrefsToDb } from '../../lib/enums';
import { calculateProfileCompletion } from '../../lib/profileUtils';
import { uploadPhoto, setPhotoAt, removePhotoAt, MAX_PHOTOS } from '../../lib/photos';
import PreferencesSheet from '../../components/PreferencesSheet';

// 3 across, matching the blueprint's photo grid
const PHOTO_SLOT = (Dimensions.get('window').width - 40 - 16) / 3;

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

  // Photo editing
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null); // { index, uri, isReplace }

  // Refetch on focus so completion % reflects edits made in edit-profile
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (error) console.error('fetchProfile error:', error);
    if (data) {
      setProfile(data);
      setIncognito(!!data.paused);
      setUserPrefs(mapDbPrefsToUI(data));
    }
  };

  const photos = profile?.photos || [];

  const pickPhoto = async (index) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to update your pictures.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: index === 0 ? [1, 1] : [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    // Always confirm before the photo actually changes
    setPendingPhoto({ index, uri: result.assets[0].uri, isReplace: !!photos[index] });
  };

  const confirmPhoto = async () => {
    if (!pendingPhoto) return;
    const { index, uri } = pendingPhoto;
    setPendingPhoto(null);

    const uid = getCurrentUserId();
    if (!uid) return;
    setUploadingIndex(index);

    try {
      const url = await uploadPhoto(uid, uri, index === 0 ? 'profile' : `flat-${index}`);
      const nextPhotos = setPhotoAt(photos, index, url);
      const { error } = await supabase.from('profiles').update({ photos: nextPhotos }).eq('id', uid);
      if (error) throw error;
      setProfile((p) => ({ ...p, photos: nextPhotos }));
    } catch (e) {
      console.error('Photo upload failed:', e);
      Alert.alert('Error', 'Failed to update photo. Please try again.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemovePhoto = (index) => {
    Alert.alert('Remove photo', 'Remove this photo from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const uid = getCurrentUserId();
        if (!uid) return;
        const nextPhotos = removePhotoAt(photos, index);
        const { error } = await supabase.from('profiles').update({ photos: nextPhotos }).eq('id', uid);
        if (error) {
          Alert.alert('Error', 'Failed to remove photo.');
          return;
        }
        setProfile((p) => ({ ...p, photos: nextPhotos }));
      }}
    ]);
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
            <TouchableOpacity activeOpacity={0.8} style={{ width: 72, height: 72, position: 'relative' }} onPress={() => pickPhoto(0)}>
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
              {uploadingIndex === 0 && (
                <View style={s.avatarUploading}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
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

        {/* Photos */}
        <View style={s.section}>
          <View style={s.photoHeader}>
            <Text style={s.sectionLabel}>PHOTOS</Text>
            <Text style={s.photoHint}>tap to edit · hold to remove</Text>
          </View>
          <View style={s.photoGrid}>
            {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
              <TouchableOpacity
                key={i}
                style={s.photoSlot}
                activeOpacity={0.8}
                onPress={() => pickPhoto(i)}
                onLongPress={() => photos[i] && handleRemovePhoto(i)}
              >
                {photos[i] ? (
                  <>
                    <Image source={{ uri: photos[i] }} style={s.photoSlotImg} resizeMode="cover" />
                    {i === 0 && (
                      <View style={s.photoBadge}>
                        <Text style={s.photoBadgeText}>Main</Text>
                      </View>
                    )}
                  </>
                ) : uploadingIndex === i ? (
                  <ActivityIndicator size="small" color={colors.blue} />
                ) : (
                  <Ionicons name="add" size={24} color="#C0C5D0" />
                )}
                {uploadingIndex === i && photos[i] && (
                  <View style={s.photoSlotUploading}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
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

      {/* Confirm before a photo actually changes */}
      <Modal visible={!!pendingPhoto} transparent animationType="fade" onRequestClose={() => setPendingPhoto(null)}>
        <Pressable style={s.confirmBackdrop} onPress={() => setPendingPhoto(null)}>
          <Pressable style={s.confirmBox} onPress={() => {}}>
            <Text style={s.confirmTitle}>
              {pendingPhoto?.index === 0
                ? (pendingPhoto?.isReplace ? 'Change profile photo?' : 'Set profile photo?')
                : (pendingPhoto?.isReplace ? 'Replace this photo?' : 'Add this photo?')}
            </Text>
            <Text style={s.confirmSub}>
              {pendingPhoto?.index === 0
                ? 'This is the first thing people see in the feed.'
                : 'This will be shown on your profile.'}
            </Text>
            {pendingPhoto && (
              <Image source={{ uri: pendingPhoto.uri }} style={s.confirmPreview} resizeMode="cover" />
            )}
            <View style={s.confirmActions}>
              <TouchableOpacity style={[s.confirmBtn, s.confirmCancel]} onPress={() => setPendingPhoto(null)}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, s.confirmOk]} onPress={confirmPhoto}>
                <Text style={s.confirmOkText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

  avatarUploading: { position: 'absolute', inset: 0, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },

  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  photoHint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot: { width: PHOTO_SLOT, height: PHOTO_SLOT, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EDEEF2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoSlotImg: { ...StyleSheet.absoluteFillObject, borderRadius: 14 },
  photoSlotUploading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  photoBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  photoBadgeText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, color: '#fff' },

  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  confirmBox: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  confirmTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, marginBottom: 4 },
  confirmSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginBottom: 16 },
  confirmPreview: { width: '100%', height: 200, borderRadius: 14, marginBottom: 18, backgroundColor: colors.canvas },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, borderRadius: 50, paddingVertical: 12, alignItems: 'center' },
  confirmCancel: { backgroundColor: '#F2F3F7' },
  confirmCancelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  confirmOk: { backgroundColor: colors.blue },
  confirmOkText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#fff' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 10 },
  settingsGroup: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EDEEF2' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  settingsIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink },
  settingsSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginTop: 2 },
});
