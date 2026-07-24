import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    ImageBackground,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CookieConsentBanner from "../../components/CookieConsentBanner";
import LegalDoc from "../../components/LegalDoc";
import GoogleLogo from "../../assets/images/signin-google-logo.svg";
import { signInWithGoogle } from "../../lib/auth";
import { getCookieConsent, setCookieConsent } from "../../lib/cookieConsent";
import { COOKIE_DOC, PRIVACY_DOC, TERMS_DOC } from "../../lib/legal";
import { colors } from "../../lib/theme";

const { height: SCREEN_H } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);

  // Manual backdrop-fade + sheet-slide (decoupled), same as ProfileViewSheet —
  // Modal's own animationType="slide" transforms the whole subtree together,
  // so the backdrop rides along with the sheet instead of dimming instantly.
  const legalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const legalSheetY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (legalDoc) {
      Animated.parallel([
        Animated.timing(legalBackdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(legalSheetY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      legalBackdropOpacity.setValue(0);
      legalSheetY.setValue(SCREEN_H);
    }
  }, [legalDoc]);

  useEffect(() => {
    if (Platform.OS === "web" && getCookieConsent() === null) {
      setShowCookieBanner(true);
    }
  }, []);

  const handleCookieDecision = (decision) => {
    setCookieConsent(decision);
    setShowCookieBanner(false);
  };

  const topY = useRef(new Animated.Value(-20)).current;
  const topOpacity = useRef(new Animated.Value(0)).current;
  const bottomY = useRef(new Animated.Value(20)).current;
  const bottomOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(topOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(topY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(bottomOp, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(bottomY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleGoogleSignIn = async () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Not available",
        "Google sign-in on native requires a dev-build. Use phone or email instead.",
      );
      return;
    }
    setLoading(true);
    try {
      await signInWithGoogle();
      // Auth listener in _layout will route automatically
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        console.error("signInWithGoogle failed:", e);
        Alert.alert("Sign in failed", "Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <View style={styles.frame}>
      <ImageBackground
        source={require("../../assets/images/hero.jpeg")}
        style={styles.bg}
        imageStyle={styles.bgImage}
        resizeMode="cover"
      >
        {/* grain effect */}
        <View style={styles.grain} />
        {/* gradients */}
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.42)",
            "rgba(0,0,0,0.2)",
            "rgba(0,0,0,0.07)",
            "transparent",
          ]}
          locations={[0, 0.4, 0.75, 1]}
          style={styles.topFade}
        />
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0,0,0,0.07)",
            "rgba(0,0,0,0.24)",
            "rgba(0,0,0,0.48)",
            "rgba(0,0,0,0.72)",
            "rgba(0,0,0,0.88)",
            "rgba(0,0,0,0.95)",
          ]}
          locations={[0, 0.15, 0.32, 0.5, 0.68, 0.85, 1]}
          style={styles.bottomFade}
        />

        {/* top: logo + headline */}
        <Animated.View
          style={[
            styles.top,
            { paddingTop: insets.top + 40 },
            { opacity: topOpacity, transform: [{ translateY: topY }] },
          ]}
        >
          <View style={styles.logoWrap}>
            <View
              style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]}
            />
            <View
              style={[
                styles.circle,
                { backgroundColor: colors.violet, right: 0, opacity: 0.92 },
              ]}
            />
          </View>
          <Text style={styles.appName}>Venn</Text>
          <Text style={styles.headline}>
            Find where your lives{"\n"}overlap.
          </Text>
          <Text style={styles.tagline}>
            The flatmate app designed to be deleted.
          </Text>
        </Animated.View>

        {/* bottom: buttons */}
        <Animated.View
          style={[
            styles.bottom,
            { paddingBottom: insets.bottom + 32 },
            { opacity: bottomOp, transform: [{ translateY: bottomY }] },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              router.push({
                pathname: "/auth-methods",
                params: { mode: "signup" },
              })
            }
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.blue, colors.violet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.primaryBtnText}>Create account</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() =>
              router.push({
                pathname: "/auth-methods",
                params: { mode: "signin" },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.ghostBtnText}>Sign in</Text>
          </TouchableOpacity>

          {Platform.OS === "web" && (
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={styles.googleBtnText}>Signing in…</Text>
              ) : (
                <View style={styles.googleBtnRow}>
                  <View style={styles.googleLogoBg}>
                    <GoogleLogo width={16} height={16} />
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.legal}>
            By tapping Create account or Sign in, you agree to our{" "}
            <Text
              style={styles.legalLink}
              onPress={() => setLegalDoc(TERMS_DOC)}
            >
              Terms
            </Text>
            . Learn how we process your data in our{" "}
            <Text
              style={styles.legalLink}
              onPress={() => setLegalDoc(PRIVACY_DOC)}
            >
              Privacy Policy
            </Text>{" "}
            and{" "}
            <Text
              style={styles.legalLink}
              onPress={() => setLegalDoc(COOKIE_DOC)}
            >
              Cookies Policy
            </Text>
            .
          </Text>
        </Animated.View>
      </ImageBackground>

      <CookieConsentBanner
        visible={showCookieBanner}
        onAccept={() => handleCookieDecision("accepted")}
        onReject={() => handleCookieDecision("rejected")}
      />

      <Modal
        visible={!!legalDoc}
        transparent
        animationType="none"
        onRequestClose={() => setLegalDoc(null)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "rgba(10,10,20,0.55)",
                opacity: legalBackdropOpacity,
              },
            ]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLegalDoc(null)}
          />

          <Animated.View
            style={[
              styles.legalCard,
              { transform: [{ translateY: legalSheetY }] },
            ]}
          >
            <ScrollView
              style={styles.legalScroll}
              showsVerticalScrollIndicator={false}
            >
              {legalDoc && <LegalDoc doc={legalDoc} />}
            </ScrollView>
            <TouchableOpacity
              style={styles.legalCloseBtn}
              onPress={() => setLegalDoc(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.legalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // The explicit height lives on this wrapper, not on ImageBackground itself —
  // ImageBackground (react-native-web) copies width/height straight from its own
  // style onto the inner image layer, and doing that with height set but no
  // matching width breaks the image's fill sizing on some mobile browsers.
  frame: {
    flex: 1,
    ...Platform.select({ web: { height: "100dvh", overflow: "hidden" } }),
  },
  bg: { flex: 1, backgroundColor: "#000" },
  // Forces the inner image layer to fill its box instead of rendering at its
  // own intrinsic pixel size (which on web can end up narrower than the
  // screen, showing only a cropped-in window of the photo).
  bgImage: { width: "100%", height: "100%" },
  grain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "30%",
  },
  bottomFade: {
    position: "absolute",
    top: "30%",
    left: 0,
    right: 0,
    bottom: 0,
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 6,
    zIndex: 2,
  },
  logoWrap: { width: 52, height: 34, position: "relative", marginBottom: 4 },
  circle: {
    position: "absolute",
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  appName: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 22,
    color: "#fff",
    letterSpacing: -0.4,
  },
  headline: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 34,
    color: "#fff",
    textAlign: "center",
    letterSpacing: -1.2,
    lineHeight: 40,
    marginTop: 2,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 22,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    gap: 12,
    zIndex: 2,
  },
  primaryBtn: { borderRadius: 50, overflow: "hidden" },
  gradientBtn: { paddingVertical: 18, alignItems: "center", borderRadius: 50 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  ghostBtn: {
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  ghostBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  googleBtn: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  googleBtnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  googleLogoBg: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  googleBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
  legal: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 16,
  },
  legalLink: {
    color: "rgba(255,255,255,0.55)",
    textDecorationLine: "underline",
  },

  legalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  legalScroll: { maxHeight: 480 },
  legalCloseBtn: {
    marginTop: 16,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: colors.ink,
  },
  legalCloseBtnText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
