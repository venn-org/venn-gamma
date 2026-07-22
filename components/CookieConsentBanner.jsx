import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, ScrollView, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../lib/theme';
import { COOKIE_DOC } from '../lib/legal';
import LegalDoc from './LegalDoc';

const { height: SCREEN_H } = Dimensions.get('window');

// Shown once on the landing screen before the user signs up/in. Persistence
// (so it never shows again after a decision) is handled by the caller via
// lib/cookieConsent.js — this component is just the accept/reject UI.
export default function CookieConsentBanner({ visible, onAccept, onReject }) {
  const [showPolicy, setShowPolicy] = useState(false);

  // Manual backdrop-fade + sheet-slide (decoupled) so the backdrop doesn't
  // ride along with the sheet's slide transform, which reads as a solid
  // black panel growing up the screen instead of an instant dim.
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(SCREEN_H);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onReject}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,20,0.55)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onReject} />

        <Animated.View style={[s.card, { transform: [{ translateY: sheetY }] }]}>
          {showPolicy ? (
            <>
              <ScrollView style={s.policyScroll} showsVerticalScrollIndicator={false}>
                <LegalDoc doc={COOKIE_DOC} />
              </ScrollView>
              <TouchableOpacity style={s.backLink} onPress={() => setShowPolicy(false)} activeOpacity={0.7}>
                <Text style={s.backLinkText}>Back</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.title}>We use cookies</Text>
              <Text style={s.body}>
                Venn uses cookies to keep you signed in, remember your preferences, and understand how the app is used.{' '}
                <Text style={s.link} onPress={() => setShowPolicy(true)}>Read our Cookies Policy</Text>.
              </Text>
            </>
          )}

          {!showPolicy && (
            <View style={s.actions}>
              <TouchableOpacity style={s.rejectBtn} onPress={onReject} activeOpacity={0.85}>
                <Text style={s.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.acceptBtnWrap} onPress={onAccept} activeOpacity={0.85}>
                <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.acceptBtn}>
                  <Text style={s.acceptBtnText}>Accept</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, maxHeight: '80%' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, marginBottom: 8 },
  body: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.slate, lineHeight: 21 },
  link: { color: colors.blue, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  rejectBtn: { flex: 1, borderRadius: 50, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: colors.mist },
  rejectBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink },
  acceptBtnWrap: { flex: 1, borderRadius: 50, overflow: 'hidden' },
  acceptBtn: { paddingVertical: 15, alignItems: 'center', borderRadius: 50 },
  acceptBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#fff' },
  policyScroll: { maxHeight: 420 },
  backLink: { marginTop: 16, alignSelf: 'center' },
  backLinkText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.blue },
});
