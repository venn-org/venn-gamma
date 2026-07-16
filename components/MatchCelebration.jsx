import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Image, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';

const { height: SCREEN_H } = Dimensions.get('window');

// A simple deterministic random generator for the confetti
const random = (seed) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export default function MatchCelebration({ visible, matchedName, matchedPhoto, onDismiss, onChat }) {
  // 30 pieces of confetti
  const pieces = Array.from({ length: 30 }).map((_, i) => ({
    x: random(i) * 100, // 0 to 100%
    size: 6 + random(i + 100) * 8, // 6 to 14
    color: ['#335CFF', '#8A5BFF', '#FF4D6A', '#22C55E', '#FFD600'][Math.floor(random(i + 200) * 5)],
    isCircle: random(i + 300) > 0.5,
  }));

  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      anims.forEach((anim, i) => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: 2500 + random(i) * 1500,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={ms.bg} onPress={onDismiss}>
        {/* Confetti */}
        {pieces.map((p, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: 0,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.isCircle ? p.size / 2 : 2,
              transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [-20, SCREEN_H + 20] }) }],
              opacity: anims[i].interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.9, 0.9, 0] }),
            }}
          />
        ))}

        {/* Card — stop propagation so tapping card doesn't dismiss */}
        <Pressable onPress={e => e.stopPropagation()} style={ms.card}>
          <Text style={ms.eyebrow}>YOUR VENN OVERLAPS ✦</Text>
          <Text style={ms.heading}>
            {'You & '}<Text style={{ color: '#fff' }}>{matchedName}</Text>{'\nare a circle apart'}
          </Text>
          <Text style={ms.sub}>
            Lifestyle, budget and area preferences overlap — say hi and see where it goes
          </Text>

          {/* Avatar pair */}
          <View style={ms.avatarRow}>
            <View style={ms.avatarWrapLeft}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} style={ms.avatarInner}>
                <Text style={ms.avatarInitial}>Me</Text>
              </LinearGradient>
            </View>
            <View style={ms.heartCircle}>
              <Ionicons name="heart" size={18} color="#fff" />
            </View>
            <View style={ms.avatarWrapRight}>
              {matchedPhoto ? (
                <Image source={{ uri: matchedPhoto }} style={ms.avatarImg} resizeMode="cover" />
              ) : (
                <LinearGradient colors={['#8A5BFF', '#335CFF']} style={ms.avatarInner}>
                  <Text style={ms.avatarInitial}>{matchedName?.[0] ?? '?'}</Text>
                </LinearGradient>
              )}
            </View>
          </View>

          {/* Send a message */}
          <TouchableOpacity onPress={onChat} activeOpacity={0.85} style={{ width: '100%' }}>
            <LinearGradient
              colors={['#335CFF', '#8A5BFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={ms.btnPrimary}
            >
              <Text style={ms.btnPrimaryText}>Send a message</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ms = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(10,10,20,0.92)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', alignItems: 'center', zIndex: 2 },
  eyebrow: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#8A5BFF', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
  heading: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: 'rgba(255,255,255,0.7)', textAlign: 'center', letterSpacing: -0.8, lineHeight: 34, marginBottom: 10 },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  avatarWrapLeft: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#335CFF', overflow: 'hidden' },
  avatarWrapRight: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#8A5BFF', overflow: 'hidden' },
  avatarInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: '#fff' },
  heartCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#335CFF', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginHorizontal: -8 },
  btnPrimary: { borderRadius: 50, paddingVertical: 16, alignItems: 'center', width: '100%' },
  btnPrimaryText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
