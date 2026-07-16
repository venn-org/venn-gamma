import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';

export default function StandoutsScreen() {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    fetchStandouts();
  }, []);

  const fetchStandouts = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    
    // Simplistic query for standouts
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', uid)
      .eq('user_type', 'owner')
      .limit(10);
      
    if (data) setProfiles(data);
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
        <TouchableOpacity style={s.keysBtn} activeOpacity={0.8}>
          <Text style={s.keysLabel}>Get Keys</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={s.subtitle}>The best rooms available right now.</Text>
      </View>

      <View style={[s.root, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        {profiles.length === 0 ? (
          <>
            <Ionicons name="home-outline" size={48} color="rgba(255,255,255,0.25)" />
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>
              No standouts right now
            </Text>
            <TouchableOpacity style={{ marginTop: 20, padding: 12, backgroundColor: 'rgba(138,91,255,0.22)', borderRadius: 8 }} onPress={fetchStandouts}>
              <Text style={s.ownersText}>Refresh</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={{ color: 'white' }}>{profiles.length} Standouts available. Feed UI coming soon.</Text>
        )}
      </View>
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
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 16.8 },
  keysBtn: { flexShrink: 0, alignItems: 'center', gap: 4, backgroundColor: '#1E0F38', borderRadius: 16, padding: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(138,91,255,0.35)' },
  keysLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: '#8A5BFF' },
});
