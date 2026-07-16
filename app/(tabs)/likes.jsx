import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';

const { width } = Dimensions.get('window');
const CARD_W = (width - 32 - 12) / 2;

export default function LikesScreen() {
  const insets = useSafeAreaInsets();
  const [likes, setLikes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLikes = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setRefreshing(true);
    
    // Simplistic query for who liked the current user
    const { data } = await supabase
      .from('likes')
      .select('id, created_at, from_user_id, profiles!from_user_id(name, photos)')
      .eq('to_user_id', uid)
      .order('created_at', { ascending: false });
      
    if (data) {
      setLikes(data.map(l => ({
        id: l.id,
        userId: l.from_user_id,
        name: l.profiles?.name || 'Someone',
        photo: Array.isArray(l.profiles?.photos) ? l.profiles.photos[0] : null
      })));
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLikes();
  }, []);

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.topBar}>
        <Text style={s.title}>Likes You</Text>
        <TouchableOpacity style={s.boostBtn} activeOpacity={0.85}>
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
            {likes.map((like) => (
              <TouchableOpacity key={like.id} style={s.likeCard} activeOpacity={0.85}>
                <View style={s.likePhotoWrap}>
                  {like.photo ? (
                    <Image source={{ uri: like.photo }} style={s.likePhoto} resizeMode="cover" />
                  ) : (
                    <View style={[s.likePhoto, s.likePhotoPlaceholder]}>
                      <Ionicons name="person" size={32} color={colors.mist} />
                    </View>
                  )}
                </View>
                <View style={s.likeInfo}>
                  <Text style={s.likeName}>{like.name}</Text>
                  <Text style={s.likeTime}>Liked you</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
});
