import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Dimensions, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';
import { getBlockedIds } from '../../lib/blocks';
import ProfileViewSheet from '../../components/ProfileViewSheet';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 40 - 12) / 2; // 2 cols, 20 padding, 12 gap

export default function StandoutsScreen() {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showKeysModal, setShowKeysModal] = useState(false);

  useEffect(() => {
    fetchStandouts();
  }, []);

  const fetchStandouts = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    
    const blocked = await getBlockedIds(uid);

    // Simplistic query for standouts: owners only, recently active
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', uid)
      .eq('user_type', 'owner')
      .eq('paused', false)
      .order('last_active_at', { ascending: false })
      .limit(10);
      
    if (data) {
      setProfiles(data.filter(p => !blocked.has(p.id)));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStandouts();
    setRefreshing(false);
  };

  const handlePass = () => {
    if (!selectedProfile) return;
    // Remove from local list
    setProfiles(prev => prev.filter(p => p.id !== selectedProfile.id));
    setSelectedProfile(null);
  };

  const handleLike = async () => {
    const uid = getCurrentUserId();
    if (!uid || !selectedProfile) return;

    const targetId = selectedProfile.id;
    // Remove from local list
    setProfiles(prev => prev.filter(p => p.id !== targetId));
    setSelectedProfile(null);

    await supabase.from('likes').insert({
      from_user_id: uid,
      to_user_id: targetId
    });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 14 }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.titleRow}>
          <Text style={s.title}>Standouts</Text>
          <View style={s.ownersBadge}>
            <Text style={s.ownersText}>OWNERS</Text>
          </View>
        </View>
        <TouchableOpacity style={s.keysBtn} activeOpacity={0.8} onPress={() => setShowKeysModal(true)}>
          <Text style={s.keysLabel}>Get Keys</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={s.subtitle}>The best rooms available right now.</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8A5BFF" />}
      >
        {profiles.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 }}>
            <Ionicons name="home-outline" size={48} color="rgba(255,255,255,0.25)" />
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>
              No standouts right now
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {profiles.map(p => (
              <TouchableOpacity key={p.id} style={s.card} activeOpacity={0.85} onPress={() => setSelectedProfile(p)}>
                <View style={s.photoWrap}>
                  {p.photos?.[0] ? (
                    <Image source={{ uri: p.photos[0] }} style={s.photo} resizeMode="cover" />
                  ) : (
                    <View style={[s.photo, s.photoPlaceholder]}>
                      <Ionicons name="person" size={32} color="#555" />
                    </View>
                  )}
                  <View style={s.overlay}>
                    <Text style={s.cardName}>{p.name}</Text>
                    <Text style={s.cardSub}>{p.location || 'London'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <ProfileViewSheet 
        visible={!!selectedProfile} 
        profile={selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
        onPass={handlePass}
        onLike={handleLike}
      />

      <Modal visible={showKeysModal} transparent animationType="fade" onRequestClose={() => setShowKeysModal(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <View style={[s.modalIcon, { backgroundColor: '#1E0F38' }]}>
              <Ionicons name="key" size={32} color="#8A5BFF" />
            </View>
            <Text style={s.modalTitle}>Get Keys</Text>
            <Text style={s.modalSub}>Coming soon! Keys will allow you to unlock standout profiles instantly.</Text>
            <TouchableOpacity style={s.modalBtn} onPress={() => setShowKeysModal(false)}>
              <Text style={s.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.7 },
  ownersBadge: { backgroundColor: 'rgba(138,91,255,0.22)', borderWidth: 1, borderColor: 'rgba(138,91,255,0.45)', borderRadius: 50, paddingVertical: 3, paddingHorizontal: 10 },
  ownersText: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, fontWeight: '700', color: '#C4AAFF', letterSpacing: 0.9 },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 16.8, marginBottom: 20 },
  keysBtn: { flexShrink: 0, alignItems: 'center', gap: 4, backgroundColor: '#1E0F38', borderRadius: 16, padding: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(138,91,255,0.35)' },
  keysLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: '#8A5BFF' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingBottom: 40 },
  card: { width: CARD_W, height: CARD_W * 1.3, borderRadius: 16, overflow: 'hidden', backgroundColor: '#222' },
  photoWrap: { width: '100%', height: '100%', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#222' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingTop: 40, backgroundColor: 'rgba(0,0,0,0.5)' },
  cardName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff', marginBottom: 2 },
  cardSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#aaa' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: '#111', marginBottom: 8, textAlign: 'center' },
  modalSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBtn: { backgroundColor: '#111', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 50, width: '100%', alignItems: 'center' },
  modalBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' },
});
