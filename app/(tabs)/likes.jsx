import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, Dimensions, RefreshControl, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';
import ProfileViewSheet from '../../components/ProfileViewSheet';
import MatchCelebration from '../../components/MatchCelebration';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_W = (width - 32 - 12) / 2;

export default function LikesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [likes, setLikes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLike, setSelectedLike] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [showBoost, setShowBoost] = useState(false);

  const fetchLikes = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setRefreshing(true);
    
    // Fetch who liked the current user along with their full profile
    const { data } = await supabase
      .from('likes')
      .select('id, created_at, from_user_id, profiles!from_user_id(*)')
      .eq('to_user_id', uid)
      .order('created_at', { ascending: false });
      
    if (data) {
      setLikes(data.map(l => ({
        likeId: l.id,
        userId: l.from_user_id,
        profile: l.profiles // The full profile row
      })).filter(l => l.profile)); // ensure profile exists
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLikes();
  }, []);

  const handlePass = async () => {
    if (!selectedLike) return;
    const { likeId } = selectedLike;
    setSelectedLike(null);
    setLikes(prev => prev.filter(l => l.likeId !== likeId));

    // Delete the like from DB
    await supabase.from('likes').delete().eq('id', likeId);
  };

  const handleLikeBack = async () => {
    const uid = getCurrentUserId();
    if (!uid || !selectedLike) return;

    const targetId = selectedLike.userId;
    const profile = selectedLike.profile;
    
    setSelectedLike(null);
    setLikes(prev => prev.filter(l => l.userId !== targetId));

    // Insert like back
    const { error } = await supabase.from('likes').insert({
      from_user_id: uid,
      to_user_id: targetId
    });

    if (error && error.code !== '23505') {
      Alert.alert('Error', 'Failed to match');
    } else {
      // Due to trg_mutual_like, this created a match! Show celebration.
      setMatchData({
        name: profile.name,
        photo: profile.photos?.[0]
      });
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.topBar}>
        <Text style={s.title}>Likes You</Text>
        <TouchableOpacity style={s.boostBtn} activeOpacity={0.85} onPress={() => setShowBoost(true)}>
          <Ionicons name="flash" size={14} color="#fff" />
          <Text style={s.boostText}>Boost</Text>
        </TouchableOpacity>
      </View>

      {likes.length === 0 ? (
        <ScrollView
          contentContainerStyle={[s.center, { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLikes} tintColor={colors.blue} />}
        >
          <Text style={s.emptyTitle}>{"Have patience —\nsomeone's checking you out"}</Text>
          <Text style={s.emptySub}>Your profile is out there. When someone likes you, they'll show up here.</Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.grid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLikes} tintColor={colors.blue} />}
          >
            {likes.map((l) => (
              <TouchableOpacity key={l.likeId} style={s.likeCard} activeOpacity={0.85} onPress={() => setSelectedLike(l)}>
                <View style={s.likePhotoWrap}>
                  {l.profile?.photos?.[0] ? (
                    <Image source={{ uri: l.profile.photos[0] }} style={s.likePhoto} resizeMode="cover" />
                  ) : (
                    <View style={[s.likePhoto, s.likePhotoPlaceholder]}>
                      <Ionicons name="person" size={32} color={colors.mist} />
                    </View>
                  )}
                </View>
                <View style={s.likeInfo}>
                  <Text style={s.likeName}>{l.profile?.name}</Text>
                  <Text style={s.likeTime}>Liked you</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ProfileViewSheet
        visible={!!selectedLike}
        profile={selectedLike?.profile}
        onClose={() => setSelectedLike(null)}
        onPass={handlePass}
        onLike={handleLikeBack}
      />

      <Modal visible={showBoost} transparent animationType="fade" onRequestClose={() => setShowBoost(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <View style={s.modalIcon}>
              <Ionicons name="flash" size={32} color="#fff" />
            </View>
            <Text style={s.modalTitle}>Boost your profile</Text>
            <Text style={s.modalSub}>Coming soon! Get pushed to the top of the feed so more people see you first.</Text>
            <TouchableOpacity style={s.modalBtn} onPress={() => setShowBoost(false)}>
              <Text style={s.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {matchData && (
        <MatchCelebration
          visible={!!matchData}
          matchedName={matchData.name}
          matchedPhoto={matchData.photo}
          onDismiss={() => setMatchData(null)}
          onChat={() => {
            setMatchData(null);
            router.push('/(tabs)/messages');
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },
  boostBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.blue, borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10 },
  boostText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 24 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center', letterSpacing: -0.44, marginTop: 4, marginBottom: 10, lineHeight: 28 },
  emptySub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16, paddingBottom: 100 },
  likeCard: { width: CARD_W, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff' },
  likePhotoWrap: { width: '100%', height: CARD_W * 1.25, position: 'relative' },
  likePhoto: { width: '100%', height: '100%' },
  likePhotoPlaceholder: { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  likeInfo: { padding: 12 },
  likeName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink, marginBottom: 2 },
  likeTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  modalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, marginBottom: 8, textAlign: 'center' },
  modalSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#9AA0B2', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBtn: { backgroundColor: colors.ink, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 50, width: '100%', alignItems: 'center' },
  modalBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' },
});
