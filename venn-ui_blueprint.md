# Venn Alpha UI Blueprint

This document details the UI structure and styles for every screen and component in the Venn Alpha project. Use this as a 1-to-1 reference for rebuilding the UI.

## File: `app/(auth)/email-otp.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, ActivityIndicator`

### JSX Structure (Return blocks)
```jsx
<View style={styles.container}>
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={styles.text}>Redirecting…</Text>
    </View>
```

### StyleSheet
```javascript
container: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { fontSize: 14, color: colors.placeholder },
```

---

## File: `app/(auth)/email.jsx`

### UI Dependencies
- React Native: `View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated`
- Hardcoded Colors: `#fff, #e02020`
- Fonts: `SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <View style={styles.sentBody}>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
              <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
            </View>
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.sentSubtitle}>
            We sent a sign-in link to{'\n'}
            <Text style={{ fontWeight: '700', color: colors.ink }}>{email}</Text>
          </Text>
          <Text style={styles.sentHint}>
            Click the link in the email to sign in. You can close this screen — the link will bring you back.
          </Text>

          <TouchableOpacity
            style={[styles.resendBtn, loading && styles.btnDisabled]}
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.resendBtnText}>{loading ? 'Sending…' : 'Resend link'}</Text>
          </TouchableOpacity>
        </View>
      </View>
```

```jsx
<View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateY: slideY }] }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoWrap}>
            <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
          </View>
        </View>
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>We'll send you a magic link to sign in — no password needed.</Text>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={colors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          autoFocus
        />
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={handleSend}
          disabled={!valid || loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
            <Text style={styles.btnText}>{loading ? 'Sending…' : 'Send sign-in link'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
```

### StyleSheet
```javascript
container: { flex: 1, backgroundColor: colors.paper },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 14 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  logoRow: { marginBottom: 24 },
  logoWrap: { width: 32, height: 20, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, color: colors.ink, letterSpacing: -0.8, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.placeholder, marginBottom: 28 },
  input: { backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 17, fontSize: 16, color: colors.ink, borderWidth: 2, borderColor: 'transparent' },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { borderRadius: 50, overflow: 'hidden' },
  btnDisabled: { opacity: 0.32 },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#e02020', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  // "Check your email" state
  sentBody: { flex: 1, paddingHorizontal: 28, paddingTop: 20, alignItems: 'center', justifyContent: 'center' },
  sentSubtitle: { fontSize: 16, color: colors.slate, textAlign: 'center', lineHeight: 24, marginBottom: 12 },
  sentHint: { fontSize: 13, color: colors.placeholder, textAlign: 'center', lineHeight: 20, marginBottom: 32, paddingHorizontal: 12 },
  resendBtn: { borderRadius: 50, paddingVertical: 14, paddingHorizontal: 36, borderWidth: 1.5, borderColor: colors.mist },
  resendBtnText: { fontSize: 14, fontWeight: '600', color: colors.ink },
```

---

## File: `app/(auth)/login.jsx`

### UI Dependencies
- React Native: `Alert, ImageBackground, View, Text, TouchableOpacity, StyleSheet, Animated, Platform`
- Hardcoded Colors: `#000, #fff`
- Fonts: `SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<View style={styles.frame}>
      <ImageBackground source={require('../../assets/hero.jpeg')} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
        {/* grain effect */}
        <View style={styles.grain} />
        {/* gradients */}
        <View style={styles.topFade} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.92)']}
          style={styles.bottomFade}
        />

        {/* top: logo + headline */}
        <Animated.View style={[styles.top, { paddingTop: insets.top + 40 }, { opacity: topOpacity, transform: [{ translateY: topY }] }]}>
          <View style={styles.logoWrap}>
            <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.92 }]} />
          </View>
          <Text style={styles.appName}>Venn</Text>
          <Text style={styles.headline}>Find where your lives{'\n'}overlap.</Text>
          <Text style={styles.tagline}>The flatmate app designed to be deleted.</Text>
        </Animated.View>

        {/* bottom: buttons */}
        <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + 32 }, { opacity: bottomOp, transform: [{ translateY: bottomY }] }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
              <Text style={styles.primaryBtnText}>Create account</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.push('/(auth)/signin')}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostBtnText}>Sign in</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleBtnText}>{loading ? 'Signing in…' : '🔵  Continue with Google'}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.legal}>
            By tapping Create account or Sign in, you agree to our{' '}
            <Text style={styles.legalLink}>Terms</Text>. Learn how we process your data in our{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text> and{' '}
            <Text style={styles.legalLink}>Cookies Policy</Text>.
          </Text>
        </Animated.View>
      </ImageBackground>
    </View>
```

### StyleSheet
```javascript
// The explicit height lives on this wrapper, not on ImageBackground itself —
  // ImageBackground (react-native-web) copies width/height straight from its own
  // style onto the inner image layer, and doing that with height set but no
  // matching width breaks the image's fill sizing on some mobile browsers.
  frame: { flex: 1, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  bg: { flex: 1, backgroundColor: '#000' },
  // Forces the inner image layer to fill its box instead of rendering at its
  // own intrinsic pixel size (which on web can end up narrower than the
  // screen, showing only a cropped-in window of the photo).
  bgImage: { width: '100%', height: '100%' },
  grain: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.06)' },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: '22%', backgroundColor: 'rgba(0,0,0,0.28)' },
  bottomFade: { position: 'absolute', top: '42%', left: 0, right: 0, bottom: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 28, gap: 6, zIndex: 2 },
  logoWrap: { width: 52, height: 34, position: 'relative', marginBottom: 4 },
  circle: { position: 'absolute', top: 0, width: 34, height: 34, borderRadius: 17 },
  appName: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 22, color: '#fff', letterSpacing: -0.4 },
  headline: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 34, color: '#fff', textAlign: 'center', letterSpacing: -1.2, lineHeight: 40, marginTop: 2 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 28, gap: 12, zIndex: 2 },
  primaryBtn: { borderRadius: 50, overflow: 'hidden' },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  ghostBtn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  ghostBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleBtn: { borderRadius: 50, paddingVertical: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  googleBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  legal: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 16 },
  legalLink: { color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' },
```

---

## File: `app/(auth)/phone-otp.jsx`

### UI Dependencies
- React Native: `View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated`
- Hardcoded Colors: `#fff`
- Fonts: `SpaceGrotesk_700Bold, SpaceMono_400Regular`

### JSX Structure (Return blocks)
```jsx
) => clearTimeout(t
```

```jsx
<View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.progressTrack}>
        <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '20%' }]} />
      </View>

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateY: slideY }] }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoWrap}>
            <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
          </View>
        </View>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>Sent to +91 {phone}</Text>

        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeX }] }]}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={r => inputs.current[i] = r}
              style={[styles.otpBox, d && styles.otpBoxFilled]}
              value={d}
              onChangeText={v => handleChange(v, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </Animated.View>

        <TouchableOpacity onPress={handleResend} disabled={cooldown > 0}>
          <Text style={[styles.resend, cooldown > 0 && { color: colors.placeholder }]}>
            {cooldown > 0 ? `RESEND CODE IN ${cooldown}S` : 'RESEND CODE'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, !complete && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={!complete || loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
            <Text style={styles.btnText}>{loading ? 'Verifying…' : 'Verify & sign in'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
```

### StyleSheet
```javascript
container: { flex: 1, backgroundColor: colors.paper },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 28, marginTop: 14, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  logoRow: { marginBottom: 24 },
  logoWrap: { width: 32, height: 20, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, color: colors.ink, letterSpacing: -0.8, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.placeholder, marginBottom: 32 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 },
  otpBox: { width: 48, height: 62, borderRadius: 14, backgroundColor: colors.inputBg, borderWidth: 2, borderColor: 'transparent', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, textAlign: 'center', color: colors.ink },
  otpBoxFilled: { borderColor: colors.blue, backgroundColor: '#fff' },
  resend: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, letterSpacing: 1.2, color: colors.blue, textAlign: 'center' },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { borderRadius: 50, overflow: 'hidden' },
  btnDisabled: { opacity: 0.32 },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
```

---

## File: `app/(auth)/phone.jsx`

### UI Dependencies
- React Native: `View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, Platform`
- Hardcoded Colors: `#fff`
- Fonts: `SpaceMono_400Regular, SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
) => clearTimeout(t
```

```jsx
<View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.statusBar}>
        <Text style={styles.step}>STEP 1 OF 5</Text>
      </View>
      <View style={styles.progressTrack}>
        <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '20%' }]} />
      </View>

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateY: slideY }] }]}>
        <Text style={styles.title}>What's your phone number?</Text>
        <Text style={styles.subtitle}>We only use this to verify it's you. It won't appear on your profile.</Text>

        <View style={styles.inputRow}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.dialCode}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={v => setPhone(v.replace(/\D/g, ''))}
            autoFocus
          />
        </View>

        {spamWarning ? (
          <Text style={styles.warningText}>{spamWarning}</Text>
        ) : (
          <Text style={styles.hint}>Venn will send you a verification code. Standard rates may apply.</Text>
        )}

        {/* Spam protection info */}
        <View style={styles.protectionRow}>
          <Text style={styles.protectionIcon}>🛡️</Text>
          <Text style={styles.protectionText}>Protected by reCAPTCHA · Max 5 codes per day</Text>
        </View>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          id="phone-send-btn"
          nativeID="phone-send-btn"
          style={[styles.btn, (phone.length < 10 || !!spamWarning) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={phone.length < 10 || loading || !!spamWarning}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Sending…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
```

### StyleSheet
```javascript
container: { flex: 1, backgroundColor: colors.paper },
  statusBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 28, paddingTop: 14 },
  step: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 28, marginTop: 14, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  countryCode: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 14, height: 56 },
  flag: { fontSize: 20 },
  dialCode: { fontSize: 16, fontWeight: '500', color: colors.ink },
  input: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 18, height: 56, fontSize: 16, color: colors.ink, borderWidth: 2, borderColor: 'transparent' },
  hint: { fontSize: 12, color: colors.placeholder, textAlign: 'center', marginTop: 8 },
  warningText: { fontSize: 13, color: colors.error, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  protectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, opacity: 0.6 },
  protectionIcon: { fontSize: 12 },
  protectionText: { fontSize: 11, color: colors.placeholder },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
```

---

## File: `app/(auth)/signin.jsx`

### UI Dependencies
- React Native: `Alert, ImageBackground, View, Text, TouchableOpacity, StyleSheet, Animated, Platform`
- Hardcoded Colors: `#111, #fff`
- Fonts: `SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<View style={styles.frame}>
      <ImageBackground source={require('../../assets/hero.jpeg')} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.92)']} style={styles.overlay} />

        <TouchableOpacity style={[styles.back, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <View style={styles.backCircle}>
            <Text style={styles.backArrow}>‹</Text>
          </View>
        </TouchableOpacity>

        <Animated.View style={[styles.content, { paddingBottom: insets.bottom + 40 }, { opacity, transform: [{ translateY: slideY }] }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
              <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
            </View>
            <Text style={styles.appName}>Venn</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue finding your flatmate.</Text>

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.phoneBtn} onPress={() => router.push('/(auth)/phone?mode=signin')} activeOpacity={0.9}>
              <Text style={styles.phoneBtnIcon}>📞</Text>
              <Text style={styles.phoneBtnText}>Sign in with phone</Text>
            </TouchableOpacity>
          )}

          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.phoneBtn} onPress={() => router.push('/(auth)/phone?mode=signin')} activeOpacity={0.9}>
              <Text style={styles.phoneBtnIcon}>📞</Text>
              <Text style={styles.phoneBtnText}>Sign in with phone</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.emailBtn}
            onPress={() => router.push('/(auth)/email?mode=signin')}
            activeOpacity={0.85}
          >
            <Text style={styles.emailBtnIcon}>✉</Text>
            <Text style={styles.emailBtnText}>Sign in with email</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleBtnText}>{loading ? 'Signing in…' : '🔵  Sign in with Google'}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ImageBackground>
    </View>
```

### StyleSheet
```javascript
// The explicit height lives on this wrapper, not on ImageBackground itself —
  // ImageBackground (react-native-web) copies width/height straight from its own
  // style onto the inner image layer, and doing that with height set but no
  // matching width breaks the image's fill sizing on some mobile browsers.
  frame: { flex: 1, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  bg: { flex: 1, backgroundColor: '#111' },
  bgImage: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: '30%', left: 0, right: 0, bottom: 0 },
  back: { position: 'absolute', left: 24, zIndex: 10 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#fff', fontSize: 24, lineHeight: 28, marginLeft: -2 },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 28, gap: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  logoWrap: { width: 32, height: 20, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  appName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: '#fff' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, color: '#fff', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  phoneBtn: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  phoneBtnIcon: { fontSize: 18 },
  phoneBtnText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emailBtn: { borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  emailBtnIcon: { fontSize: 16, color: '#fff' },
  emailBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleBtn: { borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  googleBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
```

---

## File: `app/(auth)/signup.jsx`

### UI Dependencies
- React Native: `Alert, ImageBackground, View, Text, TouchableOpacity, StyleSheet, Animated, Platform`
- Hardcoded Colors: `#111, #fff`
- Fonts: `SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<View style={styles.frame}>
      <ImageBackground source={require('../../assets/hero.jpeg')} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.92)']} style={styles.overlay} />

        <TouchableOpacity style={[styles.back, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <View style={styles.backCircle}>
            <Text style={styles.backArrow}>‹</Text>
          </View>
        </TouchableOpacity>

        <Animated.View style={[styles.content, { paddingBottom: insets.bottom + 40 }, { opacity, transform: [{ translateY: slideY }] }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
              <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
            </View>
            <Text style={styles.appName}>Venn</Text>
          </View>
          <Text style={styles.title}>Get started</Text>
          <Text style={styles.subtitle}>Choose how you'd like to create your account.</Text>

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.phoneBtn} onPress={() => router.push('/(auth)/phone?mode=signup')} activeOpacity={0.9}>
              <Text style={styles.phoneBtnIcon}>📞</Text>
              <Text style={styles.phoneBtnText}>Continue with phone</Text>
            </TouchableOpacity>
          )}

          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.phoneBtn} onPress={() => router.push('/(auth)/phone?mode=signup')} activeOpacity={0.9}>
              <Text style={styles.phoneBtnIcon}>📞</Text>
              <Text style={styles.phoneBtnText}>Continue with phone</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.emailBtn}
            onPress={() => router.push('/(auth)/email?mode=signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.emailBtnIcon}>✉</Text>
            <Text style={styles.emailBtnText}>Continue with email</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleBtnText}>{loading ? 'Signing in…' : '🔵  Continue with Google'}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ImageBackground>
    </View>
```

### StyleSheet
```javascript
// The explicit height lives on this wrapper, not on ImageBackground itself —
  // ImageBackground (react-native-web) copies width/height straight from its own
  // style onto the inner image layer, and doing that with height set but no
  // matching width breaks the image's fill sizing on some mobile browsers.
  frame: { flex: 1, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  bg: { flex: 1, backgroundColor: '#111' },
  bgImage: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: '30%', left: 0, right: 0, bottom: 0 },
  back: { position: 'absolute', left: 24, zIndex: 10 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#fff', fontSize: 24, lineHeight: 28, marginLeft: -2 },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 28, gap: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  logoWrap: { width: 32, height: 20, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  appName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: '#fff' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, color: '#fff', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  phoneBtn: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  phoneBtnIcon: { fontSize: 18 },
  phoneBtnText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emailBtn: { borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  emailBtnIcon: { fontSize: 16, color: '#fff' },
  emailBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleBtn: { borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  googleBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
```

---

## File: `app/(auth)/_layout.jsx`

### UI Dependencies
- React Native: `None`

### JSX Structure (Return blocks)
*No explicit return block found.*

### StyleSheet
*No StyleSheet found.*

---

## File: `app/(onboarding)/account-type.jsx`

### UI Dependencies
- React Native: `View, Text, TouchableOpacity, StyleSheet, Alert`
- Hardcoded Colors: `#fff, #000, #EEF1FF`
- Fonts: `SpaceMono_400Regular, SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <View style={s.progressTrack}>
          <LinearGradient
            colors={[colors.blue, colors.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.progressFill, { width: '22%' }]}
          />
        </View>
        <Text style={s.stepLabel}>STEP 2 OF 9</Text>
      </View>

      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={s.body}>
        <Text style={s.title}>What brings you to Venn?</Text>
        <Text style={s.subtitle}>This shapes how your profile appears to others.</Text>

        <TouchableOpacity
          style={[s.card, type === 'seeking' && s.cardActive]}
          onPress={() => setType('seeking')}
          activeOpacity={0.8}
        >
          <View style={[s.cardIcon, type === 'seeking' && s.cardIconActive]}>
            <Text style={{ fontSize: 30 }}>🔍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, type === 'seeking' && s.cardTitleActive]}>
              I'm looking for a flat
            </Text>
            <Text style={[s.cardSub, type === 'seeking' && s.cardSubActive]}>
              Your profile appears in others' feeds as a potential flatmate
            </Text>
          </View>
          {type === 'seeking' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.blue} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.card, type === 'owner' && s.cardActive]}
          onPress={() => setType('owner')}
          activeOpacity={0.8}
        >
          <View style={[s.cardIcon, type === 'owner' && s.cardIconActive]}>
            <Text style={{ fontSize: 30 }}>🏠</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, type === 'owner' && s.cardTitleActive]}>
              I have a flat
            </Text>
            <Text style={[s.cardSub, type === 'owner' && s.cardSubActive]}>
              Your listing appears in Standouts — people send you a Key 🔑 to connect
            </Text>
          </View>
          {type === 'owner' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.blue} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[s.btn, (!type || loading) && s.btnDisabled]}
          onPress={handleContinue}
          disabled={!type || loading}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
```

### StyleSheet
```javascript
container: { flex: 1, backgroundColor: colors.paper },
  topBar: { paddingHorizontal: 28, paddingTop: 14, gap: 8 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2, textAlign: 'right' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 28 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 14, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardActive: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  cardIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  cardIconActive: { backgroundColor: '#fff' },
  cardTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink, marginBottom: 4 },
  cardTitleActive: { color: colors.blue },
  cardSub: { fontSize: 13, color: colors.slate, lineHeight: 18 },
  cardSubActive: { color: colors.ink },

  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
```

---

## File: `app/(onboarding)/birthday.jsx`

### UI Dependencies
- React Native: `Text, View, TextInput, TouchableOpacity, StyleSheet, Alert`
- Hardcoded Colors: `#fff`
- Fonts: `SpaceGrotesk_700Bold, SpaceMono_400Regular`

### JSX Structure (Return blocks)
```jsx
<OnboardingShell
      step={3} total={9}
      footer={
        <TouchableOpacity
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!valid}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      }
    >
      <Text style={styles.title}>When's your birthday?</Text>
      <Text style={styles.subtitle}>We'll only show your age on your profile.</Text>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>DAY</Text>
          <TextInput style={styles.numInput} placeholder="DD" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>MONTH</Text>
          <TextInput style={styles.numInput} placeholder="MM" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} />
        </View>
        <View style={[styles.field, { flex: 1.4 }]}>
          <Text style={styles.label}>YEAR</Text>
          <TextInput style={styles.numInput} placeholder="YYYY" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
        </View>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </OnboardingShell>
```

### StyleSheet
```javascript
title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 40 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 6 },
  numInput: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 17, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, textAlign: 'center', color: colors.ink, borderWidth: 2, borderColor: 'transparent' },
  error: { fontSize: 12, color: colors.error, marginTop: 8 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
```

---

## File: `app/(onboarding)/gender.jsx`

### UI Dependencies
- React Native: `Text, View, TouchableOpacity, StyleSheet, Alert`
- Hardcoded Colors: `#C8CAD2, #fff, #EEF1FF`
- Fonts: `SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<OnboardingShell step={5} total={9}>
      <Text style={styles.title}>Which gender best describes you?</Text>
      <Text style={styles.subtitle}>Choose what describes you best.</Text>

      {OPTIONS.map(opt => {
        const on = selected === opt;
        return (
          <TouchableOpacity key={opt} style={[styles.row, on && styles.rowOn]} onPress={() => setSelected(opt)} activeOpacity={0.8}>
            <Text style={styles.rowLabel}>{opt}</Text>
            <View style={[styles.radio, on && styles.radioOn]}>
              {on && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
```

### StyleSheet
```javascript
title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 24 },
  row: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowOn: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  rowLabel: { fontSize: 17, color: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C8CAD2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  footer: { borderTopWidth: 1, borderColor: colors.mist, paddingTop: 16, paddingHorizontal: 28, marginTop: 'auto' },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visible: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
```

---

## File: `app/(onboarding)/lifestyle.jsx`

### UI Dependencies
- React Native: `Text, View, TouchableOpacity, ScrollView, StyleSheet, Alert`
- Hardcoded Colors: `#C8CAD2, #fff`
- Fonts: `SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<OnboardingShell step={6} total={9}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>A bit about your lifestyle</Text>
        <Text style={styles.subtitle}>Visible on profile — helps you find flatmates who match your vibe.</Text>

        {QUESTIONS.map(q => (
          <View key={q.key} style={styles.question}>
            <Text style={styles.qLabel}>{q.label}</Text>
            <View style={styles.chips}>
              {OPTIONS.map(opt => {
                const on = answers[q.key] === opt;
                return (
                  <TouchableOpacity key={opt} style={[styles.chip, on && styles.chipOn]} onPress={() => setAnswer(q.key, opt)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt}</Text>
                  </TouchableOpacity>
```

### StyleSheet
```javascript
title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 28 },
  question: { marginBottom: 24, borderBottomWidth: 1, borderColor: colors.mist, paddingBottom: 20 },
  qLabel: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: colors.mist, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.slate },
  chipTextOn: { color: '#fff' },
  footer: { borderTopWidth: 1, borderColor: colors.mist, paddingTop: 16, paddingHorizontal: 28 },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visible: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
```

---

## File: `app/(onboarding)/name.jsx`

### UI Dependencies
- React Native: `View, Text, TextInput, TouchableOpacity, StyleSheet, Alert`
- Hardcoded Colors: `#fff`
- Fonts: `SpaceMono_400Regular, SpaceGrotesk_700Bold, System`

### JSX Structure (Return blocks)
```jsx
<View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.progressTrack}>
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '11%' }]} />
        </View>
        <Text style={styles.stepLabel}>STEP 1 OF 9</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>Venn doesn't verify names. We count on flatmates to be real with each other.</Text>

        <Text style={styles.label}>FIRST NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Your first name"
          placeholderTextColor={colors.placeholder}
          value={first}
          onChangeText={setFirst}
          autoFocus
        />

        <Text style={[styles.label, { marginTop: 14 }]}>LAST NAME <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Your last name"
          placeholderTextColor={colors.placeholder}
          value={last}
          onChangeText={setLast}
        />

        <Text style={styles.hint}>Last name is optional and only shared with confirmed matches.</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, (!first.trim() || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!first.trim() || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
```

### StyleSheet
```javascript
container: { flex: 1, backgroundColor: colors.paper },
  topBar: { paddingHorizontal: 28, paddingTop: 14, gap: 8 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2, textAlign: 'right' },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 7 },
  optional: { fontFamily: 'System', textTransform: 'none', letterSpacing: 0, color: colors.placeholder, fontSize: 12 },
  input: { backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 17, fontSize: 16, color: colors.ink, borderWidth: 2, borderColor: 'transparent', marginBottom: 4 },
  hint: { fontSize: 12, color: colors.placeholder, textAlign: 'center', marginTop: 16 },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
```

---

## File: `app/(onboarding)/notifications.jsx`

### UI Dependencies
- React Native: `ImageBackground, View, Text, TouchableOpacity, StyleSheet, Switch, Alert, Platform`
- Hardcoded Colors: `#fff, #000, #EEF1FF`
- Fonts: `SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<View style={styles.frame}>
      <ImageBackground source={require('../../assets/notif-bg.jpeg')} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={styles.overlay} />

        <View style={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.top}>
            <Text style={styles.title}>Don't miss when someone wants to connect</Text>
            <Text style={styles.subtitle}>Enable notifications to stay on top of your matches and messages.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.notifIcon}>
                <Text style={{ fontSize: 20 }}>💙</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Match notifications</Text>
                <Text style={styles.cardSub}>Get notified when you match</Text>
              </View>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.mist, true: colors.blue }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={finish} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
              <Text style={styles.btnText}>{loading ? 'Finishing…' : 'Continue'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
```

### StyleSheet
```javascript
// The explicit height lives on this wrapper, not on ImageBackground itself —
  // ImageBackground (react-native-web) copies width/height straight from its own
  // style onto the inner image layer, and doing that with height set but no
  // matching width breaks the image's fill sizing on some mobile browsers.
  frame: { flex: 1, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  bg: { flex: 1, backgroundColor: '#000' },
  bgImage: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: '25%', left: 0, right: 0, bottom: 0 },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  top: { gap: 12 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: '#fff', letterSpacing: -1, lineHeight: 38 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  notifIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF1FF', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  cardSub: { fontSize: 13, color: colors.slate, marginTop: 2 },
  btn: { borderRadius: 50, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
```

---

## File: `app/(onboarding)/photos.jsx`

### UI Dependencies
- React Native: `View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator`
- Hardcoded Colors: `#fff, #EEF1FF`
- Fonts: `SpaceGrotesk_700Bold, SpaceMono_400Regular, System`

### JSX Structure (Return blocks)
```jsx
<OnboardingShell step={8} total={9}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {isOwner ? (
          <>
            <Text style={styles.title}>Add your photos</Text>
            <Text style={styles.subtitle}>Your profile photo is shown first. Flat photos help people picture living there.</Text>

            <Text style={styles.sectionLabel}>YOUR PHOTO</Text>
            <Text style={styles.sectionNote}>Shown as your profile picture — required</Text>
            <TouchableOpacity
              style={styles.slotMain}
              onPress={() => pickPhoto(setProfilePhoto, [1, 1])}
              activeOpacity={0.8}
            >
              {profilePhoto
                ? <Image source={{ uri: profilePhoto }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} resizeMode="cover" />
                : <>
                    <Ionicons name="person-add-outline" size={32} color={colors.placeholder} />
                    <Text style={styles.slotLabel}>Add profile photo</Text>
                  </>
              }
              {profilePhoto && (
                <View style={styles.changeOverlay}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>FLAT PHOTOS</Text>
            <Text style={styles.sectionNote}>At least 1 required — show the living room, bedroom, common areas</Text>
            <View style={styles.grid}>
              {flatPhotos.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.slot}
                  onPress={() => pickPhoto(url => setFlatPhotos(prev => prev.map((x, j) => j === i ? url : x)), [4, 3])}
                  activeOpacity={0.8}
                >
                  {p
                    ? <>
                        <Image source={{ uri: p }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} resizeMode="cover" />
                        <View style={styles.changeOverlaySmall}>
                          <Ionicons name="camera-outline" size={14} color="#fff" />
                        </View>
                      </>
                    : <>
                        <Ionicons name="home-outline" size={24} color={colors.placeholder} />
                        <Text style={styles.slotLabel}>{i === 0 ? 'Main room' : i === 1 ? 'Bedroom' : 'Kitchen'}</Text>
                      </>
                  }
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.notice, { marginTop: 20 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.blue} />
              <Text style={styles.noticeText}>Flat photos are required so people can see what they're moving into.</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Add your photo</Text>
            <Text style={styles.subtitle}>Your profile photo is the first thing people see. Profiles with photos get 4× more responses.</Text>

            <TouchableOpacity
              style={styles.slotMain}
              onPress={() => pickPhoto(setProfilePhoto, [1, 1])}
              activeOpacity={0.8}
            >
              {profilePhoto
                ? <Image source={{ uri: profilePhoto }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} resizeMode="cover" />
                : <>
                    <Ionicons name="person-add-outline" size={32} color={colors.placeholder} />
                    <Text style={styles.slotLabel}>Add profile photo</Text>
                  </>
              }
              {profilePhoto && (
                <View style={styles.changeOverlay}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {uploading && (
          <View style={styles.uploadRow}>
            <ActivityIndicator size="small" color={colors.blue} />
            <Text style={styles.uploadText}>Uploading...</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, (!canContinue || uploading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || uploading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
        {!isOwner && (
          // Goes through handleContinue so a photo that was already uploaded
          // still gets saved to the profile instead of being discarded.
          <TouchableOpacity onPress={handleContinue} disabled={uploading}>
            <Text style={styles.skip}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </OnboardingShell>
```

### StyleSheet
```javascript
title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 24 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 4 },
  sectionNote: { fontSize: 12, color: colors.placeholder, marginBottom: 14 },
  optional: { fontFamily: 'System', textTransform: 'none', letterSpacing: 0, color: colors.placeholder, fontSize: 12 },

  slotMain: {
    width: '100%', height: 180, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.mist, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.canvas, marginBottom: 8, overflow: 'hidden',
  },
  slotLabel: { fontSize: 13, color: colors.placeholder, textAlign: 'center' },
  changeOverlay: {
    position: 'absolute', bottom: 10, right: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  changeOverlaySmall: {
    position: 'absolute', bottom: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    width: '31%', aspectRatio: 1, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.mist, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.canvas, overflow: 'hidden',
  },
  plus: { fontSize: 28, color: colors.placeholder, fontWeight: '300' },

  notice: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EEF1FF', borderRadius: 12, padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 },

  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'center' },
  uploadText: { fontSize: 13, color: colors.slate },

  footer: { paddingHorizontal: 0, paddingTop: 24, gap: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { fontSize: 14, color: colors.slate, textAlign: 'center' },
```

---

## File: `app/(onboarding)/preferences.jsx`

### UI Dependencies
- React Native: `Text, View, TouchableOpacity, ScrollView, StyleSheet, Alert`
- Hardcoded Colors: `#fff`
- Fonts: `SpaceGrotesk_700Bold, SpaceMono_400Regular`

### JSX Structure (Return blocks)
```jsx
<OnboardingShell step={7} total={9}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {isOwner ? (
          <>
            <Text style={styles.title}>Tell us about your flat</Text>
            <Text style={styles.subtitle}>Help people find you in Standouts.</Text>

            <Text style={styles.sectionLabel}>WHERE IS YOUR FLAT?</Text>
            <View style={styles.chips}>
              {AREAS.map(a => {
                const on = areas.includes(a
```

```jsx
<TouchableOpacity
                    key={a}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleArea(a)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                  </TouchableOpacity>
```

```jsx
<TouchableOpacity
                    key={b}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setBudget(b)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{b}</Text>
                  </TouchableOpacity>
```

```jsx
<TouchableOpacity
                    key={t}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setFlatType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
                  </TouchableOpacity>
```

```jsx
<TouchableOpacity
                    key={a}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleArea(a)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                  </TouchableOpacity>
```

```jsx
<TouchableOpacity
                    key={b}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setBudget(b)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{b}</Text>
                  </TouchableOpacity>
```

### StyleSheet
```javascript
title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 16 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: colors.mist, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.slate },
  chipTextOn: { color: '#fff' },
  footer: { paddingHorizontal: 28, paddingTop: 12, gap: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { fontSize: 14, color: colors.slate, textAlign: 'center' },
```

---

## File: `app/(onboarding)/pronouns.jsx`

### UI Dependencies
- React Native: `Text, View, TouchableOpacity, ScrollView, StyleSheet, Alert`
- Hardcoded Colors: `#fff, #EEF1FF, #C8CAD2`
- Fonts: `SpaceGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<OnboardingShell step={4} total={9}>
      <Text style={styles.title}>What are your pronouns?</Text>
      <Text style={styles.subtitle}>Optional. Pick up to four that feel right.</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {OPTIONS.map(opt => {
          const on = selected.includes(opt
```

```jsx
<TouchableOpacity key={opt} style={[styles.row, on && styles.rowOn]} onPress={() => toggle(opt)} activeOpacity={0.8}>
              <Text style={styles.rowLabel}>{opt}</Text>
              <View style={[styles.check, on && styles.checkOn]}>
                {on && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
```

### StyleSheet
```javascript
title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 24 },
  row: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowOn: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  rowLabel: { fontSize: 17, color: colors.ink },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#C8CAD2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  footer: { borderTopWidth: 1, borderColor: colors.mist, paddingTop: 16, paddingHorizontal: 28 },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visible: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
```

---

## File: `app/(onboarding)/_layout.jsx`

### UI Dependencies
- React Native: `None`

### JSX Structure (Return blocks)
*No explicit return block found.*

### StyleSheet
*No StyleSheet found.*

---

## File: `app/(tabs)/chat.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image, Animated, Alert, Modal, Pressable,`
- Hardcoded Colors: `#FF4D6A, #9AA0B2, #fff, #F2F3F7, #F0F1F5, #22C55E, #000`
- Fonts: `SpaceGrotesk_700Bold, HankenGrotesk_400Regular, HankenGrotesk_600SemiBold`

### JSX Structure (Return blocks)
```jsx
) => {
      const currentUid = uidRef.current;
      if (currentUid) channel.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUid, typing: false } }
```

```jsx
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/messages')} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerCenter}
            onPress={() => otherProfile && setProfileVisible(true)}
            activeOpacity={0.7}
          >
            <View style={s.headerAvatar}>
              {photo
                ? <Image source={{ uri: photo }} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
                : <Text style={s.headerAvatarInitial}>{(displayName[0] ?? '?').toUpperCase()}</Text>
              }
            </View>
            <View>
              <Text style={s.headerName}>{displayName}</Text>
              {otherTyping ? (
                <Text style={[s.headerStatus, s.headerStatusTyping]}>Typing…</Text>
              ) : otherStatus ? (
                <Text style={[s.headerStatus, !otherStatus.startsWith('Active now') && s.headerStatusOffline]}>
                  {otherStatus}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.moreBtn} activeOpacity={0.7} onPress={() => setMenuOpen(true)}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={[s.menuBackdrop, { paddingTop: insets.top + 60 }]} onPress={() => setMenuOpen(false)}>
            <View style={s.menuBox}>
              <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false
```

### StyleSheet
```javascript
screen: { flex: 1, backgroundColor: '#F2F3F7' },

  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  headerAvatarInitial: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.slate },
  headerName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink },
  headerStatus: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#22C55E' },
  headerStatusOffline: { color: '#9AA0B2' },
  headerStatusTyping: { color: colors.blue, fontFamily: 'HankenGrotesk_600SemiBold' },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingRight: 16,
  },
  menuBox: {
    backgroundColor: '#fff', borderRadius: 14, minWidth: 160,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 4 },
    elevation: 8, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12, paddingBottom: 8 },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  loadMoreText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 16 },
  msgAvatarText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, color: colors.slate },

  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  bubbleText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 4 },
  msgTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 10, color: '#9AA0B2' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F1F5' },
  input: { flex: 1, backgroundColor: colors.canvas, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnDisabled: { backgroundColor: colors.canvas },
```

---

## File: `app/(tabs)/feed.jsx`

### UI Dependencies
- React Native: `View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, Pressable, Dimensions, TextInput, Animated, Alert, RefreshControl,`
- Hardcoded Colors: `#14161B, #fff, #9AA0B2, #335CFF, #8A5BFF, #080A14, #1C1E30, #FF4D6A, #EEF0FF, #F3EEFF, #22C55E, #E6E8EE, #F2F3F7, #F0FFF4, #000, #FDF5F0, #F0F1F5, #F0F0F4, #F8F9FC, #5A6072, #F0F4FF`
- Fonts: `SpaceGrotesk_700Bold, SpaceMono_400Regular, HankenGrotesk_400Regular, HankenGrotesk_700Bold, HankenGrotesk_600SemiBold`

### JSX Structure (Return blocks)
```jsx
Array.isArray(draft) ? draft : []).includes(opt
```

```jsx
<Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={[qs.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY: sheetY }] }]}>
          <View style={qs.handle} />
          <View style={qs.header}>
            <Text style={qs.title}>{row.label}</Text>
            <TouchableOpacity style={qs.closeBtn} onPress={animateClose} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }} contentContainerStyle={qs.opts}>
            {isAreas ? (
              <>
                {AREA_GROUPS.map(group => (
                  <View key={group.city} style={{ width: '100%' }}>
                    <Text style={qs.groupLabel}>{group.city}</Text>
                    <View style={qs.groupChips}>
                      {group.areas.map(opt => (
                        <TouchableOpacity key={opt} style={[qs.chip, sel(opt) && qs.chipOn]} onPress={() => toggle(opt)} activeOpacity={0.8}>
                          <Text style={[qs.chipText, sel(opt) && qs.chipTextOn]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
                {customAreas.length > 0 && (
                  <View style={{ width: '100%' }}>
                    <Text style={qs.groupLabel}>Other</Text>
                    <View style={qs.groupChips}>
                      {customAreas.map(a => (
                        <TouchableOpacity key={a} style={[qs.chip, qs.chipOn, qs.chipCustom]} onPress={() => removeCustom(a)} activeOpacity={0.8}>
                          <Text style={[qs.chipText, qs.chipTextOn]}>{a}</Text>
                          <Ionicons name="close" size={12} color="#fff" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {showOther ? (
                  <View style={qs.otherRow}>
                    <TextInput style={qs.otherInput} placeholder="Type a location..." placeholderTextColor="#9AA0B2" value={otherInput} onChangeText={setOtherInput} autoFocus returnKeyType="done" onSubmitEditing={addCustom} />
                    <TouchableOpacity style={qs.otherAddBtn} onPress={addCustom} activeOpacity={0.8}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[qs.chip, qs.chipDashed]} onPress={() => setShowOther(true)} activeOpacity={0.8}>
                    <Ionicons name="add" size={14} color={colors.slate} />
                    <Text style={[qs.chipText, { marginLeft: 4 }]}>Other</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              row.opts.map(opt => (
                <TouchableOpacity key={opt} style={[qs.chip, sel(opt) && qs.chipOn]} onPress={() => toggle(opt)} activeOpacity={0.8}>
                  <Text style={[qs.chipText, sel(opt) && qs.chipTextOn]}>{opt}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={qs.footer}>
            <TouchableOpacity onPress={() => { onSave(rowKey, draft
```

```jsx
) => loopRef.current?.stop(
```

```jsx
<Animated.View style={{ transform: [{ translateX: dx }] }}>
        <LinearGradient
          colors={[colors.blue, colors.violet]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            width: AVATAR_SIZE + 6, height: AVATAR_SIZE + 6,
            borderRadius: (AVATAR_SIZE + 6) / 2,
            padding: 3, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{
            width: AVATAR_SIZE, height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2, overflow: 'hidden',
            borderWidth: 3, borderColor: '#080A14',
            backgroundColor: '#1C1E30', alignItems: 'center', justifyContent: 'center',
          }}>
            {photo
              ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 36, color: '#fff' }}>{init}</Text>
            }
          </View>
        </LinearGradient>
      </Animated.View>
```

```jsx
<Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#080A14', opacity: fade }]}>
        {/* Background glow blobs */}
        <Animated.View style={{
          position: 'absolute', top: '15%', left: '-10%',
          width: 300, height: 300, borderRadius: 150,
          backgroundColor: 'rgba(51,92,255,0.16)',
          transform: [{ scale: pulse }],
        }} />
        <Animated.View style={{
          position: 'absolute', top: '18%', right: '-10%',
          width: 300, height: 300, borderRadius: 150,
          backgroundColor: 'rgba(138,91,255,0.16)',
          transform: [{ scale: pulse }],
        }} />

        {/* Content */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>

          {/* Overlapping avatars */}
          <View style={{ flexDirection: 'row', marginBottom: 36 }}>
            {avatar(myPhoto, myName, leftX)}
            <View style={{ marginLeft: -22 }}>
              {avatar(theirPhoto, theirName, rightX)}
            </View>
          </View>

          {/* Text block */}
          <Animated.View style={{ alignItems: 'center', opacity: textOp, transform: [{ translateY: textY }], width: '100%' }}>
            <LinearGradient
              colors={[colors.blue, colors.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 50, paddingVertical: 7, paddingHorizontal: 22, marginBottom: 22 }}
            >
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#fff', letterSpacing: 2 }}>
                ✦  IT'S A MATCH
              </Text>
            </LinearGradient>

            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: '#fff', textAlign: 'center', letterSpacing: -0.6, lineHeight: 34, marginBottom: 10 }}>
              {myName} & {theirName}
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 44 }}>
              You both liked each other
            </Text>

            <TouchableOpacity onPress={onMessage} activeOpacity={0.88} style={{ width: '100%', marginBottom: 14 }}>
              <LinearGradient
                colors={[colors.blue, colors.violet]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 50, paddingVertical: 17, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' }}>
                  Send a message
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ paddingVertical: 12, width: '100%', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: 'rgba(255,255,255,0.38)' }}>
                Keep swiping
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
```

```jsx
<Animated.View style={[s.cardOuter, { opacity: fadeIn }]}>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={s.menuBox}>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false
```

```jsx
<View style={[s.screen, { paddingTop: insets.top + 12 }]}>

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.logoRow}>
          <View style={s.logoWrap}>
            <View style={[s.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[s.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
          </View>
          <Text style={s.wordmark}>Venn</Text>
        </View>
        <View style={s.topBarRight}>
          <View style={s.likesPill}>
            <Ionicons name="heart" size={12} color="#22C55E" />
            <Text style={s.likesPillText}>∞ likes left</Text>
          </View>
          <TouchableOpacity
            style={s.filterIconBtn}
            activeOpacity={0.8}
            onPress={() => setShowPrefs(true)}
          >
            <Ionicons name="options-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTER_CHIPS.map(chip => {
          const section = PREF_SECTIONS.flatMap(sec => sec.rows).find(r => r.key === chip.key
```

```jsx
<TouchableOpacity
              key={chip.key}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setQuickFilter(chip.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {active
                  ? getPrefDisplay(prefs, chip.key, chip.label, section?.multi)
                  : chip.label}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={active ? '#fff' : colors.ink}
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
```

### StyleSheet
```javascript
screen: { flex: 1, backgroundColor: '#F2F3F7' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6, backgroundColor: '#F2F3F7',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoWrap: { width: 30, height: 18, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 18, height: 18, borderRadius: 9 },
  wordmark: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, letterSpacing: -0.4 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likesPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FFF4', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5,
  },
  likesPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#22C55E', letterSpacing: 0.3 },
  filterIconBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  filterScroll: { flexShrink: 0, flexGrow: 0, backgroundColor: '#F2F3F7' },
  filterRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 50, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterChipActive: { backgroundColor: colors.ink },
  filterChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  filterChipTextActive: { color: '#fff' },

  separator: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginHorizontal: -20 },

  banner: {
    margin: 12, backgroundColor: '#FDF5F0', borderRadius: 16,
    padding: 14, paddingRight: 30, position: 'relative',
  },
  bannerClose: { position: 'absolute', top: 10, right: 10, opacity: 0.4, padding: 4 },
  bannerTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink, marginBottom: 2 },
  bannerSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2', marginBottom: 10 },
  bannerBtn: {
    alignSelf: 'flex-start', backgroundColor: colors.ink,
    borderRadius: 50, paddingHorizontal: 20, paddingVertical: 9,
  },
  bannerBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#fff' },

  feedContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },

  skipBtn: {
    position: 'absolute', left: 22,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 120, paddingRight: 20,
  },
  menuBox: {
    backgroundColor: '#fff', borderRadius: 14, minWidth: 160,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 4 },
    elevation: 8, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.slate },
  refreshBtn: { backgroundColor: colors.ink, borderRadius: 50, paddingHorizontal: 26, paddingVertical: 12 },
  refreshBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#fff' },

  // Card
  cardOuter: { backgroundColor: '#F2F3F7' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingBottom: 12,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  overlapPill: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  overlapText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: '#fff', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  pronouns: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },
  dot: { fontSize: 13, color: '#9AA0B2' },
  active: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },
  navBtns: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  photoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 400 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  heartBtn: {
    position: 'absolute', bottom: 14, right: 14,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoItemText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  infoDivider: { width: 1, height: 20, backgroundColor: '#F0F0F4' },
  infoHorizDivider: { height: 1, backgroundColor: '#F0F0F4', marginVertical: 8 },
  promptWhite: { position: 'relative', backgroundColor: '#fff', borderRadius: 20, padding: 24, paddingBottom: 60, marginBottom: 10 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.slate, marginBottom: 10 },
  promptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4, lineHeight: 30 },
  promptHeartGray: { position: 'absolute', bottom: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  promptAccent: { position: 'relative', borderRadius: 20, padding: 24, paddingBottom: 60, marginBottom: 10 },
  promptAccentQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.violet, marginBottom: 10 },
  promptHeartViolet: {
    position: 'absolute', bottom: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.violet, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  flatPhotoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 280 },
  flatPhoto: { width: '100%', height: '100%' },
  flatLabel: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  flatLabelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#fff' },
```

---

## File: `app/(tabs)/likes.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, Image, Dimensions, Animated, Alert, RefreshControl,`
- Hardcoded Colors: `#EEF0FF, #C8CAD2, #E6E8EE, #14161B, #FDDCB5, #fff, #FF4D6A, #335CFF, #8A5BFF, #9AA0B2, #F8F9FF, #F0FFF4, #22C55E, #000, #F0F1F5, #FFF0F3, #5A6072, #EDEEF2`
- Fonts: `SpaceGrotesk_700Bold, HankenGrotesk_400Regular, HankenGrotesk_700Bold, HankenGrotesk_600SemiBold`

### JSX Structure (Return blocks)
```jsx
<Svg viewBox="0 0 280 240" width={260} height={220}>
      <Ellipse cx={140} cy={130} rx={110} ry={90} fill="#EEF0FF" opacity={0.8} />
      <G transform="translate(70,65)">
        <Ellipse cx={80} cy={100} rx={38} ry={18} fill="#C8CAD2" opacity={0.35} />
        <Path d="M60 88 h60 a9 9 0 0 1 0 18 H60 a9 9 0 0 1 0-18z" fill="#E6E8EE" />
        <Path d="M50 68 h50 a10 10 0 0 1 0 28 H50 a10 10 0 0 1 0-28z" fill="#14161B" opacity={0.8} />
        <Circle cx={40} cy={74} r={16} fill="#FDDCB5" />
        <Path d="M26 68 Q40 54 54 68" fill="#14161B" opacity={0.9} />
        <Path d="M54 68 Q68 60 72 72" stroke="#FDDCB5" strokeWidth={8} strokeLinecap="round" fill="none" />
        <Ellipse cx={122} cy={94} rx={12} ry={7} fill="#14161B" opacity={0.85} />
        <Ellipse cx={112} cy={100} rx={12} ry={7} fill="#14161B" opacity={0.85} />
      </G>
      <G>
        <Circle cx={54} cy={72} r={16} fill="#fff" />
        <Path d="M54 79l-1.2-1.1C49.5 75.2 47 73 47 70.3c0-2.5 1.9-4.3 4.3-4.3 1.2 0 2.4.6 3 1.5.6-.9 1.8-1.5 3-1.5C59.8 66 62 67.8 62 70.3c0 2.7-2.5 4.9-6.8 8.6L54 79z" fill="#FF4D6A" opacity={0.85} />
      </G>
      <G>
        <Circle cx={228} cy={60} r={16} fill="#fff" />
        <Path d="M228 67l-1.2-1.1C223.5 63.2 221 61 221 58.3c0-2.5 1.9-4.3 4.3-4.3 1.2 0 2.4.6 3 1.5.6-.9 1.8-1.5 3-1.5C233.8 54 236 55.8 236 58.3c0 2.7-2.5 4.9-6.8 8.6L228 67z" fill="#335CFF" opacity={0.85} />
      </G>
      <G>
        <Circle cx={44} cy={160} r={12} fill="#fff" />
        <Path d="M44 166l-.9-.8C40.8 163 39 161.2 39 159.2c0-1.9 1.4-3.2 3.2-3.2.9 0 1.8.4 2.3 1.1.5-.7 1.4-1.1 2.3-1.1C48.6 156 50 157.4 50 159.2c0 2-1.8 3.8-5.1 6L44 166z" fill="#8A5BFF" opacity={0.85} />
      </G>
      <G>
        <Circle cx={238} cy={158} r={12} fill="#fff" />
        <Path d="M238 164l-.9-.8C234.8 161 233 159.2 233 157.2c0-1.9 1.4-3.2 3.2-3.2.9 0 1.8.4 2.3 1.1.5-.7 1.4-1.1 2.3-1.1C242.6 154 244 155.4 244 157.2c0 2-1.8 3.8-5.1 6L238 164z" fill="#FF4D6A" opacity={0.85} />
      </G>
    </Svg>
```

```jsx
<TouchableOpacity style={s.likeCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.likePhotoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={s.likePhoto} resizeMode="cover" />
        ) : (
          <View style={[s.likePhoto, s.likePhotoPlaceholder]}>
            <Ionicons name="person" size={32} color={colors.mist} />
          </View>
        )}
      </View>
      <View style={s.likeInfo}>
        <Text style={s.likeName}>{name}</Text>
        <Text style={s.likeTime}>Liked you</Text>
      </View>
    </TouchableOpacity>
```

```jsx
<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[s.overlay, { height: '92%', paddingBottom: insets.bottom + 16 }]}>
          <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
            <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
              <View style={s.menuBox}>
                <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false
```

```jsx
<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, paddingHorizontal: 24, paddingTop: 24 }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />
          {/* header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#335CFF', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
              <Ionicons name="flash" size={34} color="#fff" />
            </LinearGradient>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: '#14161B', marginBottom: 6 }}>Boost your profile</Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', lineHeight: 20 }}>Get pushed to the top of the feed{'\n'}so more people see you first.</Text>
          </View>
          {/* stats */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, backgroundColor: '#F8F9FF', borderRadius: 16, padding: 16 }}>
            {[['11×', 'More views'], ['1 hr', 'Featured'], ['Free', 'During beta']].map(([val, label]) => (
              <View key={label} style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: '#335CFF', marginBottom: 2 }}>{val}</Text>
                <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' }}>{label}</Text>
              </View>
            ))}
          </View>
          {active ? (
            <View style={{ backgroundColor: '#F0FFF4', borderRadius: 50, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#22C55E' }}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#22C55E' }}>✓ Boost active for 1 hour</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setActive(true)} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 50, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' }}>Activate Boost · Free</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
```

```jsx
<View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.topBar}>
        <Text style={s.title}>Likes You</Text>
        <TouchableOpacity style={s.boostBtn} activeOpacity={0.85} onPress={() => setShowBoost(true)}>
          <Ionicons name="flash" size={14} color="#fff" />
          <Text style={s.boostText}>Boost</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LikesSkeleton />
      ) : likes.length === 0 ? (
        <ScrollView
          contentContainerStyle={[s.center, { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
        >
          <EmptyIllustration />
          <Text style={s.emptyTitle}>{"Have patience —\nsomeone's checking you out"}</Text>
          <Text style={s.emptySub}>Your profile is out there. When someone likes you, they'll show up here.</Text>
          {!Object.values(prefs).some(v => Array.isArray(v) ? v.length > 0 : !!v) && (
            <TouchableOpacity style={s.setPrefBtn} onPress={() => setShowPrefs(true)} activeOpacity={0.85}>
              <Text style={s.setPrefText}>Set preferences</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <Animated.View style={{ flex: 1, opacity: gridFade }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.grid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
          >
            {likes.map((like, i) => (
              <LikeCard key={like.id} like={like} onPress={() => setSelected(i)} />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <ProfileOverlay
        visible={selected !== null}
        like={selectedLike}
        onClose={() => setSelected(null)}
        onPass={() => setSelected(null)}
        onLike={() => handleLikeBack(selectedLike)}
        onBlock={() => handleBlockLike(selectedLike)}
        onReport={() => setReportTarget(selectedLike)}
      />

      <MatchCelebration
        visible={matchData !== null}
        matchedName={matchData?.like?.profiles?.name}
        matchedPhoto={matchData?.like?.profiles?.photos?.[0]}
        onChat={() => {
          const d = matchData;
          const n = d.like.profiles?.name ?? '';
          const ph = d.like.profiles?.photos?.[0] ?? '';
          setMatchData(null
```

### StyleSheet
```javascript
screen: { flex: 1, backgroundColor: colors.canvas },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },
  boostBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.blue, borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10 },
  boostText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 24 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center', letterSpacing: -0.44, marginTop: 4, marginBottom: 10, lineHeight: 28 },
  emptySub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  setPrefBtn: { width: '100%', backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  setPrefText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' },
  grayText: { color: '#9AA0B2', fontFamily: 'HankenGrotesk_400Regular', fontSize: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16, paddingBottom: 100 },
  likeCard: { width: CARD_W, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff' },
  likePhotoWrap: { width: '100%', height: CARD_W * 1.25, position: 'relative' },
  likePhoto: { width: '100%', height: '100%' },
  likePhotoPlaceholder: { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  likeBlur: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(242,243,247,0.65)' },
  likeLockWrap: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  likeInfo: { padding: 12 },
  likeName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink, marginBottom: 2 },
  likeTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-start',
    paddingTop: 120, paddingLeft: 20,
  },
  menuBox: {
    backgroundColor: '#fff', borderRadius: 14, minWidth: 160,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 4 },
    elevation: 8, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

  overlay: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'absolute', bottom: 0, left: 0, right: 0 },
  overlayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10 },
  overlayClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  overlayPass: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: 'rgba(255,75,106,0.3)', alignItems: 'center', justifyContent: 'center' },
  overlayLike: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  overlayPhoto: { width: '100%', height: 320, borderRadius: 18, marginBottom: 16 },
  overlayName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.ink, marginBottom: 6 },
  overlayMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072', marginBottom: 4 },
  commentBox: { marginTop: 8, backgroundColor: '#F8F9FF', borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: colors.blue },
  commentLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  commentText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, lineHeight: 22 },

  infoCard: { backgroundColor: '#F8F9FF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EDEEF2' },
  chip: { backgroundColor: '#fff', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E6E8EE' },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072' },
  promptCard: { backgroundColor: '#F8F9FF', borderRadius: 14, padding: 14 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  promptA: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, lineHeight: 22 },
```

---

## File: `app/(tabs)/messages.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl,`
- Hardcoded Colors: `#22C55E, #fff, #C0C5D0, #9AA0B2, #000, #FF4D6A, #F0F1F5`
- Fonts: `SpaceGrotesk_700Bold, HankenGrotesk_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<View style={{ position: 'relative' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
        {photo
          ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: size * 0.38, color: colors.slate }}>{initials}</Text>
        }
      </View>
      {online && (
        <View style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff' }} />
      )}
    </View>
```

```jsx
) => {
      supabase.removeChannel(channel
```

```jsx
<View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.topBar}>
        <Text style={s.title}>Messages</Text>
        <TouchableOpacity style={s.bellBtn} activeOpacity={0.8} onPress={() => router.push('/(tabs)/notifications')}>
          <Ionicons name="notifications-outline" size={18} color={colors.ink} />
          {hasUnread && <View style={s.bellDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.whiteCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {loading ? (
          <MessagesSkeleton />
        ) : isEmpty ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No matches yet</Text>
            <Text style={s.emptyText}>Keep swiping — when you match with someone, they'll show up here.</Text>
          </View>
        ) : (
          <>
            {newMatches.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>New Matches</Text>
                  <Text style={s.sectionCount}>{newMatches.length} new</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 18 }}>
                  {newMatches.map(m => (
                    <TouchableOpacity key={m.id} style={s.newMatchItem} onPress={() => openChat(m)} activeOpacity={0.8}>
                      <Avatar photo={m.photo} name={m.name} size={60} />
                      <Text style={s.newMatchName}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={s.divider} />
              </View>
            )}

            {yourTurn.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>Your turn ({yourTurn.length})</Text>
                </View>
                {yourTurn.map(m => (
                  <TouchableOpacity key={m.id} style={s.chatRow} onPress={() => openChat(m)} activeOpacity={0.8}>
                    <Avatar photo={m.photo} name={m.name} online={m.online} />
                    <View style={s.chatInfo}>
                      <View style={s.chatNameRow}>
                        <Text style={s.chatName}>{m.name}</Text>
                        {m.hasNewMsg && <View style={s.newMsgDot} />}
                      </View>
                      <Text style={[s.chatMsg, m.hasNewMsg && s.chatMsgUnread]} numberOfLines={1}>{m.lastMsg}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#C0C5D0" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {theirTurn.length > 0 && (
              <View style={[s.section, { paddingTop: 10 }]}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>Their turn ({theirTurn.length})</Text>
                </View>
                {theirTurn.map(m => (
                  <TouchableOpacity key={m.id} style={s.chatRow} onPress={() => openChat(m)} activeOpacity={0.8}>
                    <Avatar photo={m.photo} name={m.name} online={m.online} />
                    <View style={s.chatInfo}>
                      <View style={s.chatNameRow}>
                        <Text style={s.chatName}>{m.name}</Text>
                        {m.hasNewMsg && <View style={s.newMsgDot} />}
                      </View>
                      <Text style={[s.chatMsg, { color: '#9AA0B2' }, m.hasNewMsg && s.chatMsgUnread]} numberOfLines={1}>{m.lastMsg}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#C0C5D0" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
```

### StyleSheet
```javascript
screen: { flex: 1, backgroundColor: colors.canvas },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2, position: 'relative' },
  bellDot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D6A', borderWidth: 2, borderColor: colors.canvas },

  whiteCard: { flex: 1, backgroundColor: colors.canvas },

  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', lineHeight: 20 },

  section: { paddingHorizontal: 20, paddingTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink },
  sectionCount: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.blue },
  divider: { height: 1, backgroundColor: '#F0F1F5', marginTop: 6 },

  newMatchItem: { alignItems: 'center', gap: 6 },
  newMatchName: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: colors.ink },

  chatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  chatInfo: { flex: 1, minWidth: 0 },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  chatName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink },
  chatMsg: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  chatMsgUnread: { color: colors.ink, fontFamily: 'HankenGrotesk_700Bold' },
  newMsgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D6A' },
```

---

## File: `app/(tabs)/notifications.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, TouchableOpacity, ScrollView,`
- Hardcoded Colors: `#FFF0F3, #FF4D6A, #EEF1FF, #D5D8E0, #fff, #9AA0B2, #F0F1F5`
- Fonts: `SpaceGrotesk_700Bold, HankenGrotesk_600SemiBold, SpaceMono_400Regular, HankenGrotesk_400Regular`

### JSX Structure (Return blocks)
```jsx
<TouchableOpacity style={[s.row, !last && s.rowBorder]} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={s.rowBody}>
        <Text style={[s.rowText, !notif.read && s.rowTextUnread]}>{textFor(notif)}</Text>
        <Text style={s.rowTime}>{timeAgo(notif.createdAt)}</Text>
      </View>
      {!notif.read && <View style={s.unreadDot} />}
    </TouchableOpacity>
```

```jsx
<View style={[s.screen, { paddingTop: insets.top + 4 }]}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={handleMarkAllRead}>
          <Text style={s.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <NotifsSkeleton />
        ) : isEmpty ? (
          <View style={s.empty}>
            <Ionicons name="notifications-outline" size={40} color="#D5D8E0" />
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptySub}>Likes, matches, and messages will show up here.</Text>
          </View>
        ) : (
          <>
            {today.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>TODAY</Text>
                {today.map((n, i) => (
                  <NotifRow key={n.id} notif={n} last={i === today.length - 1} onPress={() => handlePress(n)} />
                ))}
              </View>
            )}
            {yesterday.length > 0 && (
              <View style={[s.section, { marginTop: 8 }]}>
                <Text style={s.sectionLabel}>YESTERDAY</Text>
                {yesterday.map((n, i) => (
                  <NotifRow key={n.id} notif={n} last={i === yesterday.length - 1} onPress={() => handlePress(n)} />
                ))}
              </View>
            )}
            {earlier.length > 0 && (
              <View style={[s.section, { marginTop: 8 }]}>
                <Text style={s.sectionLabel}>EARLIER</Text>
                {earlier.map((n, i) => (
                  <NotifRow key={n.id} notif={n} last={i === earlier.length - 1} onPress={() => handlePress(n)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
```

### StyleSheet
```javascript
screen: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.ink },
  markAll: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 10 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody: { flex: 1 },
  rowText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink, lineHeight: 20, marginBottom: 3 },
  rowTextUnread: { fontFamily: 'HankenGrotesk_600SemiBold' },
  rowTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, flexShrink: 0 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 100, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptySub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', textAlign: 'center', lineHeight: 19 },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 },
```

---

## File: `app/(tabs)/profile.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Image, Alert, ActivityIndicator, Modal, Pressable, TextInput, Dimensions, KeyboardAvoidingView, Platform, Animated, PanResponder,`
- Hardcoded Colors: `#335CFF, #8A5BFF, #E6E8EE, #fff, #9AA0B2, #C0C5D0, #14161B, #F2F3F7, #F0F1F5, #ECEDF8, #EEF0FF, #F3EEFF, #000, #EEF1FF, #F0EEFF, #FFF6EC, #FF8B3E, #EEFCF3, #FFF0F3, #FF4D6A, #E8EDFF, #D0D3DE, #5A6072, #EDEEF2, #F8F9FC, #F0F0F4`
- Fonts: `SpaceGrotesk_700Bold, HankenGrotesk_400Regular, HankenGrotesk_700Bold, HankenGrotesk_600SemiBold, SpaceMono_400Regular`

### JSX Structure (Return blocks)
```jsx
<TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ width: 72, height: 72, position: 'relative' }}>
      <Svg width={72} height={72} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#335CFF" />
            <Stop offset="1" stopColor="#8A5BFF" />
          </SvgGradient>
        </Defs>
        <Circle cx={36} cy={36} r={32} fill="none" stroke="#E6E8EE" strokeWidth={3.5} />
        <Circle
          cx={36} cy={36} r={32} fill="none"
          stroke="url(#ring)" strokeWidth={3.5}
          strokeDasharray={201} strokeDashoffset={offset}
          strokeLinecap="round" rotation={-90} origin="36, 36"
        />
      </Svg>
      {photo ? (
        <Image source={{ uri: photo }} style={{ position: 'absolute', inset: 5, borderRadius: 33 }} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 5, borderRadius: 33, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: '#fff' }}>{initials}</Text>
        </LinearGradient>
      )}
      <View style={{ position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Ionicons name="camera" size={9} color="#fff" />
      </View>
    </TouchableOpacity>
```

```jsx
<TouchableOpacity style={[p.settingsRow, !last && p.settingsRowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[p.settingsIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={p.settingsTitle}>{title}</Text>
        {subtitle ? <Text style={[p.settingsSub, subtitleColor && { color: subtitleColor }]}>{subtitle}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={16} color="#C0C5D0" />}
    </TouchableOpacity>
```

```jsx
<Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_H * 0.86, paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Basic Info</Text>
            <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', paddingHorizontal: 20, marginBottom: 16 }}>Shown on your profile card.</Text>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={bi.label}>NAME</Text>
              <TextInput style={bi.input} placeholder="Your name" placeholderTextColor="#9AA0B2" value={name} onChangeText={setName} />

              <Text style={[bi.label, { marginTop: 18 }]}>BIRTHDAY</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[bi.numInput, { flex: 1 }]} placeholder="DD" placeholderTextColor="#9AA0B2" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} />
                <TextInput style={[bi.numInput, { flex: 1 }]} placeholder="MM" placeholderTextColor="#9AA0B2" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} />
                <TextInput style={[bi.numInput, { flex: 1.4 }]} placeholder="YYYY" placeholderTextColor="#9AA0B2" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
              </View>
              {!!error && <Text style={bi.error}>{error}</Text>}

              <Text style={[bi.label, { marginTop: 20 }]}>GENDER</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {GENDER_OPTIONS.map(opt => {
                  const on = gender === opt;
                  return (
                    <TouchableOpacity key={opt} style={[bi.chip, on && bi.chipOn]} onPress={() => setGender(on ? null : opt)} activeOpacity={0.8}>
                      <Text style={[bi.chipText, on && bi.chipTextOn]}>{opt}</Text>
                    </TouchableOpacity>
```

```jsx
<TouchableOpacity key={opt} style={[bi.chip, on && bi.chipOn]} onPress={() => togglePronoun(opt)} activeOpacity={0.8}>
                      <Text style={[bi.chipText, on && bi.chipTextOn]}>{opt}</Text>
                    </TouchableOpacity>
```

```jsx
<TouchableOpacity key={opt} style={[bi.chip, on && bi.chipOn]} onPress={() => setLifestyleAnswer(q.key, on ? null : opt)} activeOpacity={0.8}>
                          <Text style={[bi.chipText, on && bi.chipTextOn]}>{opt}</Text>
                        </TouchableOpacity>
```

```jsx
<Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_H * 0.7, paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Block List</Text>
            <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {loading ? (
              <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 }}>Loading…</Text>
            ) : blocked.length === 0 ? (
              <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 }}>You haven't blocked anyone.</Text>
            ) : (
              blocked.map((b, i) => (
                <View key={b.id} style={[bl.row, i < blocked.length - 1 && bl.rowBorder]}>
                  <View style={bl.avatar}>
                    {b.photo
                      ? <Image source={{ uri: b.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      : <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.slate }}>{(b.name?.[0] ?? '?').toUpperCase()}</Text>
                    }
                  </View>
                  <Text style={bl.name}>{b.name}</Text>
                  <TouchableOpacity style={bl.unblockBtn} onPress={() => unblock(b)} activeOpacity={0.8}>
                    <Text style={bl.unblockText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
```

```jsx
<Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Work & Education</Text>
            <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', paddingHorizontal: 20, marginBottom: 20 }}>Shown on your profile card.</Text>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.55 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={we.label}>WHERE DO YOU WORK?</Text>
              <TextInput style={we.input} placeholder="Company / organisation" placeholderTextColor="#9AA0B2" value={company} onChangeText={setCompany} />

              <Text style={[we.label, { marginTop: 18 }]}>WHAT'S YOUR JOB TITLE?</Text>
              <Text style={we.hint}>If you're a student, mention that instead.</Text>
              <TextInput style={we.input} placeholder="e.g. Software Engineer, Student" placeholderTextColor="#9AA0B2" value={jobTitle} onChangeText={setJobTitle} />

              <Text style={[we.label, { marginTop: 18 }]}>WHERE DID YOU STUDY?</Text>
              <TextInput style={we.input} placeholder="College or university" placeholderTextColor="#9AA0B2" value={school} onChangeText={setSchool} />

              <Text style={[we.label, { marginTop: 18 }]}>HIGHEST LEVEL ATTAINED</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {EDU_LEVELS.map(lvl => {
                  const on = eduLevel === lvl;
                  return (
                    <TouchableOpacity key={lvl} style={[we.chip, on && we.chipOn]} onPress={() => setEduLevel(on ? null : lvl)} activeOpacity={0.8}>
                      <Text style={[we.chipText, on && we.chipTextOn]}>{lvl}</Text>
                    </TouchableOpacity>
```

```jsx
<Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity, zIndex: 0 }]} />
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 0 }]} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_H * 0.86, paddingBottom: insets.bottom + 16, zIndex: 1, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 }} />

          {step === 'pick' ? (
            <>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-back" size={16} color="#14161B" />
                  </TouchableOpacity>
                  <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Prompts</Text>
                </View>
              </View>

              {/* Category tabs */}
              <View style={{ height: 44, marginBottom: 14 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center', height: 44 }}>
                  {tabs.map(tab => (
                    <TouchableOpacity key={tab} style={[pr.tab, activeTab === tab && pr.tabActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
                      <Text style={[pr.tabText, activeTab === tab && pr.tabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={{ height: 1, backgroundColor: '#E6E8EE', marginHorizontal: 0, marginBottom: 0 }} />

              {/* Tip card */}
              <View style={{ backgroundColor: '#ECEDF8', borderRadius: 14, marginHorizontal: 20, padding: 14, marginTop: 14, marginBottom: 4 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.indigo, lineHeight: 20 }}>Try a Prompt that helps reveal something unique about you as a flatmate.</Text>
              </View>

              {/* Prompt list */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {PROMPT_CATEGORIES[activeTab].map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[pr.promptRow, i < PROMPT_CATEGORIES[activeTab].length - 1 && pr.promptRowBorder]}
                    onPress={() => pickPrompt(q)}
                    activeOpacity={0.6}
                  >
                    <Text style={pr.promptRowText}>{q}</Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            </>
          ) : (
            <>
              {/* Header: back · Write answer · Done */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 24 }}>
                <TouchableOpacity
                  onPress={editingPrompt ? animateClose : () => setStep('pick')}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={editingPrompt ? 'close' : 'arrow-back'} size={16} color="#14161B" />
                </TouchableOpacity>
                <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Write answer</Text>
                <TouchableOpacity onPress={save} disabled={saving || !answer.trim()}>
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: answer.trim() ? colors.violet : '#C0C5D0' }}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Question card with pencil to change question */}
              <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E6E8EE', borderRadius: 14, padding: 16 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: '#14161B', flex: 1, lineHeight: 22 }}>{selectedQ}</Text>
                  {!editingPrompt && (
                    <TouchableOpacity onPress={() => setStep('pick')} style={{ marginLeft: 12, padding: 4 }}>
                      <Ionicons name="pencil-outline" size={20} color="#9AA0B2" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Answer card with char count inside */}
              <View style={{ paddingHorizontal: 20, flex: 1 }}>
                <View style={{ borderWidth: 1.5, borderColor: '#E6E8EE', borderRadius: 14, padding: 16, flex: 1 }}>
                  <TextInput
                    style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B', flex: 1, textAlignVertical: 'top', minHeight: 80 }}
                    placeholder="Your answer..."
                    placeholderTextColor="#9AA0B2"
                    value={answer}
                    onChangeText={t => setAnswer(t.slice(0, 150))}
                    multiline
                    autoFocus
                  />
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#9AA0B2', textAlign: 'right', marginTop: 8 }}>{answer.length}</Text>
                </View>
              </View>

              {/* Remove button (edit mode only) */}
              {editingPrompt && onDelete && (
                <TouchableOpacity onPress={onDelete} activeOpacity={0.8} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.red }}>Remove prompt</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
```

```jsx
<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#F2F3F7' }}>
        <View style={[pv.topBar, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={pv.topTitle}>Preview</Text>
            <Text style={pv.topSub}>How you appear to others</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={pv.closeBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={16} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 }}
        >
          <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
            <Text style={pv.name}>{name}{age ? `, ${age}` : ''}</Text>
          </View>

          <View style={pv.photoWrap}>
            {photos[0] ? (
              <Image source={{ uri: photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={60} color="#C0C5D0" />
              </View>
            )}
          </View>

          <View style={pv.infoCard}>
            <View style={pv.infoRow}>
              <View style={pv.infoItem}>
                <Ionicons name="calendar-outline" size={15} color="#9AA0B2" />
                <Text style={pv.infoText}>{age ?? '—'}</Text>
              </View>
              <View style={pv.infoDivider} />
              <View style={pv.infoItem}>
                <Ionicons name="person-outline" size={15} color="#9AA0B2" />
                <Text style={pv.infoText}>{gender ?? '—'}</Text>
              </View>
              <View style={pv.infoDivider} />
              <View style={pv.infoItem}>
                <Ionicons name="location-outline" size={15} color="#9AA0B2" />
                <Text style={pv.infoText}>{area ?? '—'}</Text>
              </View>
            </View>
            {job ? (
              <>
                <View style={pv.infoHoriz} />
                <View style={[pv.infoItem, { paddingTop: 12 }]}>
                  <Ionicons name="briefcase-outline" size={15} color="#9AA0B2" />
                  <Text style={pv.infoText}>{job}</Text>
                </View>
              </>
            ) : null}
          </View>

          {regPrompts.map((pr, i) => (
            <View key={i} style={pv.promptWhite}>
              <Text style={pv.promptQ}>{pr.q}</Text>
              <Text style={pv.promptA}>{pr.a}</Text>
            </View>
          ))}

          {accentPrompt ? (
            <LinearGradient
              colors={['#EEF0FF', '#F3EEFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={pv.promptAccent}
            >
              <Text style={pv.promptAccentQ}>{accentPrompt.q}</Text>
              <Text style={pv.promptA}>{accentPrompt.a}</Text>
            </LinearGradient>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
```

```jsx
<View>
      <View
        onLayout={e => { const w = e.nativeEvent.layout.width - THUMB; trackWidthRef.current = w; setTrackWidth(w
```

```jsx
<Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' }}>Preferences</Text>
            <TouchableOpacity onPress={animateClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.6 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={pref.label}>MONTHLY BUDGET</Text>
              {budget && (
                <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.blue, marginBottom: 8 }}>{budget}</Text>
              )}
              <BudgetSlider value={budget ?? BUDGETS[0]} onChange={setBudget} />

              <Text style={[pref.label, { marginTop: 28 }]}>PREFERRED AREAS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {AREAS.map(a => {
                  const on = areas.includes(a
```

```jsx
<TouchableOpacity key={a} style={[pref.chip, on && pref.chipOn]} onPress={() => toggleArea(a)} activeOpacity={0.8}>
                      <Text style={[pref.chipText, on && pref.chipTextOn]}>{a}</Text>
                    </TouchableOpacity>
```

```jsx
<View style={[p.screen, { paddingTop: insets.top + 13 }]}>
      <View style={p.headerGray}>
        <View style={p.topRow}>
          <Text style={p.title}>Profile</Text>
          <TouchableOpacity style={p.gearBtn} activeOpacity={0.8} onPress={() => setSettingsSheet(true)}>
            <Ionicons name="settings-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <View style={p.avatarRow}>
          <RingAvatar initials={initials} pct={pct} photo={photos[0] ?? null} onPress={() => pickPhoto(0)} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Text style={p.avatarName}>{name}{age ? `, ${age}` : ''}</Text>
              {profile?.onboarding_done && (
                <Ionicons name="checkmark-circle" size={16} color={colors.blue} />
              )}
            </View>
            <TouchableOpacity onPress={pct < 100 ? goToFirstIncomplete : undefined} activeOpacity={0.7}>
              <Text style={p.avatarCompletion}>{pct}% complete{pct < 100 ? ' · tap to finish' : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={p.tabRow}>
          <TouchableOpacity style={[p.tabPill, activeTab === 'profile' && p.tabPillActive]} onPress={() => setActiveTab('profile')} activeOpacity={0.8}>
            <Text style={[p.tabPillText, activeTab === 'profile' && p.tabPillTextActive]}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[p.tabPill, activeTab === 'safety' && p.tabPillActive]} onPress={() => setActiveTab('safety')} activeOpacity={0.8}>
            <Text style={[p.tabPillText, activeTab === 'safety' && p.tabPillTextActive]}>Safety</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => Alert.alert('Venn+', "Coming soon — we're still building this.")}>
            <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={p.vennPlusTab}>
              <Ionicons name="add" size={12} color="#fff" />
              <Text style={p.vennPlusText}>Venn+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={p.white} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {activeTab === 'profile' ? (
          <>
            {pct < 100 && (
              <TouchableOpacity style={p.completeBanner} activeOpacity={0.8} onPress={goToFirstIncomplete}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View>
                      <Text style={p.completeBannerTitle}>Complete your profile</Text>
                      <Text style={p.completeBannerSub}>{[
                        !photos.length && 'Add a photo',
                        !prompts.length && 'Add a prompt',
                        !profile?.budget && 'Set budget',
                        !profile?.preferred_areas?.length && 'Set preferred areas',
                      ].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={p.completePct}>{pct}%</Text>
                      <Ionicons name="chevron-forward" size={16} color="#C0C5D0" />
                    </View>
                  </View>
                  <View style={p.progressTrack}>
                    <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[p.progressFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Photos */}
            <View style={p.sectionHeader} onLayout={e => { photosSectionY.current = e.nativeEvent.layout.y; }}>
              <Text style={p.sectionTitle}>Photos</Text>
              <Text style={p.sectionAction}>tap to edit</Text>
            </View>
            <View style={p.photoGrid}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} style={p.photoSlot} onPress={() => pickPhoto(i)} activeOpacity={0.8}>
                  {photos[i]
                    ? <Image source={{ uri: photos[i] }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} resizeMode="cover" />
                    : uploadingIndex === i
                      ? <ActivityIndicator size="small" color={colors.blue} />
                      : <Ionicons name="add" size={24} color="#C0C5D0" />
                  }
                </TouchableOpacity>
              ))}
            </View>

            <View style={p.divider} />

            {/* Basic info */}
            <View style={p.sectionHeader}>
              <Text style={p.sectionTitle}>Basic Info</Text>
              <TouchableOpacity onPress={() => setBasicInfoSheet(true)}>
                <Text style={[p.sectionAction, { color: colors.blue }]}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <SettingsRow
                iconBg="#EEF1FF" icon="person-outline" iconColor={colors.blue}
                title="Name" subtitle={name}
                onPress={() => setBasicInfoSheet(true)}
              />
              <SettingsRow
                iconBg="#EEF1FF" icon="calendar-outline" iconColor={colors.blue}
                title="Birthday" subtitle={profile?.birthday ? `${formatBirthday(profile.birthday)}${age ? ` · ${age} yrs` : ''}` : 'Not set'}
                onPress={() => setBasicInfoSheet(true)}
              />
              <SettingsRow
                iconBg="#F0EEFF" icon="male-female-outline" iconColor={colors.violet}
                title="Gender" subtitle={profile?.gender ?? 'Not set'}
                onPress={() => setBasicInfoSheet(true)}
              />
              <SettingsRow
                iconBg="#F0EEFF" icon="chatbox-ellipses-outline" iconColor={colors.violet}
                title="Pronouns" subtitle={Array.isArray(profile?.pronouns) && profile.pronouns.length ? profile.pronouns.join('/') : 'Not set'}
                onPress={() => setBasicInfoSheet(true)}
              />
              <SettingsRow
                iconBg="#FFF6EC" icon="wine-outline" iconColor="#FF8B3E"
                title="Lifestyle"
                subtitle={[profile?.drink && `Drinks: ${profile.drink}`, profile?.tobacco && `Tobacco: ${profile.tobacco}`, profile?.weed && `Cannabis: ${profile.weed}`].filter(Boolean).join(' · ') || 'Not set'}
                onPress={() => setBasicInfoSheet(true)}
                last
              />
            </View>

            <View style={p.divider} />

            {/* About you */}
            <View style={p.sectionHeader}>
              <Text style={p.sectionTitle}>About you</Text>
              <TouchableOpacity onPress={() => setPreferencesSheet(true)}>
                <Text style={[p.sectionAction, { color: colors.blue }]}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={p.chipsRow}>
              {aboutChips.map((c, i) => (
                <View key={i} style={p.chip}>
                  <Text style={p.chipEmoji}>{c.emoji}</Text>
                  <Text style={p.chipText}>{c.label}</Text>
                </View>
              ))}
            </View>

            <View style={p.divider} />

            {/* Work & Education */}
            <View style={p.sectionHeader}>
              <Text style={p.sectionTitle}>Work & Education</Text>
              <TouchableOpacity onPress={() => setWorkEduSheet(true)}>
                <Text style={[p.sectionAction, { color: colors.blue }]}>{hasWork || hasEdu ? 'Edit' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {hasWork ? (
                <TouchableOpacity style={p.infoCard} onPress={() => setWorkEduSheet(true)} activeOpacity={0.8}>
                  <Ionicons name="briefcase-outline" size={16} color="#9AA0B2" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    {profile.job_title ? <Text style={p.infoCardTitle}>{profile.job_title}</Text> : null}
                    {profile.job_company ? <Text style={p.infoCardSub}>{profile.job_company}</Text> : null}
                  </View>
                  <Ionicons name="pencil-outline" size={14} color="#C0C5D0" />
                </TouchableOpacity>
              ) : null}
              {hasEdu ? (
                <TouchableOpacity style={[p.infoCard, { marginTop: hasWork ? 8 : 0 }]} onPress={() => setWorkEduSheet(true)} activeOpacity={0.8}>
                  <Ionicons name="school-outline" size={16} color="#9AA0B2" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    {profile.education_school ? <Text style={p.infoCardTitle}>{profile.education_school}</Text> : null}
                    {profile.education_level ? <Text style={p.infoCardSub}>{profile.education_level}</Text> : null}
                  </View>
                  <Ionicons name="pencil-outline" size={14} color="#C0C5D0" />
                </TouchableOpacity>
              ) : null}
              {!hasWork && !hasEdu && (
                <TouchableOpacity style={p.addCard} onPress={() => setWorkEduSheet(true)} activeOpacity={0.8}>
                  <Ionicons name="add" size={18} color="#C0C5D0" />
                  <Text style={p.addCardText}>Add your work and education</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={p.divider} />

            {/* Prompts */}
            <View style={p.sectionHeader} onLayout={e => { promptsSectionY.current = e.nativeEvent.layout.y; }}>
              <Text style={p.sectionTitle}>Prompts</Text>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
              {[0, 1, 2].map(i => {
                const prompt = prompts[i];
                if (prompt) {
                  const category = getPromptCategory(prompt.q ?? prompt.question
```

```jsx
<TouchableOpacity
                      key={i}
                      style={p.promptCard}
                      onPress={() => { setEditingPrompt(prompt
```

```jsx
<TouchableOpacity
                    key={i}
                    style={[p.promptCard, p.promptCardEmpty]}
                    onPress={() => { setEditingPrompt(null
```

### StyleSheet
```javascript
screen: { flex: 1, backgroundColor: colors.canvas },

  headerGray: { flexShrink: 0, paddingHorizontal: 20, paddingBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },
  gearBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2 },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatarName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  avatarCompletion: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#FF8B3E' },

  tabRow: { flexDirection: 'row', gap: 8 },
  tabPill: { backgroundColor: '#fff', borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tabPillActive: { backgroundColor: colors.ink },
  tabPillText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  tabPillTextActive: { color: '#fff' },
  vennPlusTab: { borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  vennPlusText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#fff' },

  white: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },

  completeBanner: { padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  completeBannerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: colors.ink, marginBottom: 1 },
  completeBannerSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },
  completePct: { fontFamily: 'SpaceMono_400Regular', fontSize: 14, fontWeight: '700', color: colors.blue },
  progressTrack: { backgroundColor: '#E8EDFF', borderRadius: 50, height: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 50 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink },
  sectionAction: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#9AA0B2' },
  divider: { height: 1, backgroundColor: '#F0F1F5', marginHorizontal: 20 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 18 },
  photoSlot: { width: PHOTO_SLOT_SIZE, height: PHOTO_SLOT_SIZE, borderRadius: 14, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.canvas, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7 },
  chipEmoji: { fontSize: 13 },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },

  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 14, padding: 14 },
  infoCardTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  infoCardSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2', marginTop: 2 },

  addCard: { borderWidth: 1.5, borderColor: '#D0D3DE', borderStyle: 'dashed', borderRadius: 12, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addCardText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },

  promptCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, minHeight: 110, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  promptCardEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  promptCategory: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#8A5BFF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#14161B', lineHeight: 21, marginBottom: 8 },
  promptA: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072', lineHeight: 20 },
  promptATap: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginTop: 10 },
  promptAddCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDEEF2', alignItems: 'center', justifyContent: 'center' },
  promptAddText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#9AA0B2' },

  previewBtn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  previewBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#fff' },

  settingsSection: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 },
  settingsCatLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 1 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 20, gap: 12 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingsTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: colors.ink, marginBottom: 2 },
  settingsSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12 },
```

---

## File: `app/(tabs)/standouts.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, Image, TouchableOpacity, PanResponder, Animated, Modal, TextInput, ScrollView, Pressable, Dimensions, Alert,`
- Hardcoded Colors: `#14161B, #FF4D6A, #1E1E2E, #8A5BFF, #fff, #C4AAFF, #9AA0B2, #111, #1E0F38, #000, #F0F1F5, #0A0A0A, #E6E8EE, #EDE8FF, #5A6072, #F2F3F7`
- Fonts: `HankenGrotesk_600SemiBold, SpaceGrotesk_700Bold, SpaceMono_400Regular, HankenGrotesk_400Regular, HankenGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<View style={[s.root, { paddingTop: insets.top + 14, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Ionicons name="home-outline" size={48} color="rgba(255,255,255,0.25)" />
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>No standouts right now</Text>
      </View>
```

```jsx
<View style={[s.root, { paddingTop: insets.top + 14 }]}>
      {/* Menu (report / block) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={s.menuBox}>
            <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false
```

### StyleSheet
```javascript
root: { flex: 1, backgroundColor: '#111' },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.7 },
  ownersBadge: { backgroundColor: 'rgba(138,91,255,0.22)', borderWidth: 1, borderColor: 'rgba(138,91,255,0.45)', borderRadius: 50, paddingVertical: 3, paddingHorizontal: 10 },
  ownersText: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, fontWeight: '700', color: '#C4AAFF', letterSpacing: 0.9 },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 16.8 },
  keysBtn: { flexShrink: 0, alignItems: 'center', gap: 4, backgroundColor: '#1E0F38', borderRadius: 16, padding: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(138,91,255,0.35)' },
  keysLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: '#8A5BFF' },

  // Card
  cardArea: { flex: 1, position: 'relative' },
  card: { position: 'absolute', top: 0, bottom: 0, left: 14, right: 14, borderRadius: 20, overflow: 'hidden' },

  // Swipe indicators
  swipeLabel: { position: 'absolute', top: 36 },
  nopeIndicator: { left: 24, transform: [{ rotate: '-15deg' }] },
  keyIndicator: { right: 24, transform: [{ rotate: '15deg' }] },
  swipeLabelText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, fontWeight: '800', letterSpacing: 1, borderWidth: 3, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },

  // Card badges
  hasFlatBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  hasFlatText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.4 },
  rentBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  rentText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, fontWeight: '700', color: '#C4AAFF' },
  cardMenuBtn: {
    position: 'absolute', top: 54, right: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 120, paddingRight: 20,
  },
  menuBox: {
    backgroundColor: '#fff', borderRadius: 14, minWidth: 160,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 4 },
    elevation: 8, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#14161B' },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

  // Card bottom overlay
  cardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 18 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  cardAge: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 20, color: 'rgba(255,255,255,0.75)' },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#8A5BFF', alignItems: 'center', justifyContent: 'center' },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  areaText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // Prompt card on main swipe card
  promptCard: { position: 'relative', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  promptQ: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  promptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22 },

  // Dot indicators
  dots: { flexShrink: 0, flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingBottom: 8 },
  dot: { height: 6, borderRadius: 3 },

  // Floating X skip — same style as home page
  skipBtn: {
    position: 'absolute',
    left: 22,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  // Full profile overlay
  profileCard: { backgroundColor: '#0A0A0A', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  profileTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10, backgroundColor: 'rgba(26,26,46,0.95)' },
  closeCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Hero photo
  heroWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  heroImg: { width: '100%', height: 380 },
  heroInfo: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
  heroAge: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 22, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },

  // Flat photos gallery
  gallerySectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  flatPhoto: { width: '100%', height: 220, borderRadius: 16, marginBottom: 10 },

  // Info grid
  infoGrid: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  infoGridTop: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  infoCell: { flex: 1, minWidth: 80, padding: 14, alignItems: 'center' },
  infoCellLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  infoCellValue: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 16 },
  infoRowLabel: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.55)', flex: 1 },
  infoRowValue: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, fontWeight: '600', color: '#fff' },

  // Profile prompts
  profilePromptWrap: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, paddingHorizontal: 18,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  profilePromptQ: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.9 },
  profilePromptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },

  // Bottom sheets
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingTop: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  sheetIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, fontWeight: '800', color: '#14161B', textAlign: 'center', marginBottom: 10, letterSpacing: -0.4 },
  sheetBody: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#5A6072', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  sheetCta: { backgroundColor: '#8A5BFF', borderRadius: 50, padding: 16, alignItems: 'center' },
  sheetCtaText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff' },

  // Key send sheet
  keySheetIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center' },
  keySheetName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, fontWeight: '700', color: '#14161B' },
  keySheetHint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', marginBottom: 16 },
  keySheetInput: { width: '100%', minHeight: 90, borderWidth: 1.5, borderColor: '#E6E8EE', borderRadius: 14, padding: 14, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B', textAlignVertical: 'top', lineHeight: 22 },
  keySheetCancel: { flex: 1, backgroundColor: '#F2F3F7', borderRadius: 50, padding: 14, alignItems: 'center' },
  keySheetCancelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, fontWeight: '600', color: '#14161B' },
  keySheetSend: { flex: 2, backgroundColor: '#8A5BFF', borderRadius: 50, padding: 14, alignItems: 'center' },
  keySheetSendText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, fontWeight: '700', color: '#fff' },
```

---

## File: `app/(tabs)/_layout.jsx`

### UI Dependencies
- React Native: `Platform, View, StyleSheet, Text`
- Hardcoded Colors: `#FF4D6A, #fff, #FCFCFD, #E6E8EE, #9AA0B2`
- Fonts: `HankenGrotesk_700Bold, HankenGrotesk_600SemiBold`

### JSX Structure (Return blocks)
```jsx
<View>
      <Ionicons name={name} size={size} color={color} />
      {count > 0 && (
        <View style={dotStyles.badge}>
          <Text style={dotStyles.badgeText}>{count > 4 ? '4+' : count}</Text>
        </View>
      )}
    </View>
```

```jsx
) => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel
```

```jsx
<Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: '#FCFCFD' },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E6E8EE',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 56 + insets.bottom : 60,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 6,
          paddingTop: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: '#9AA0B2',
        tabBarLabelStyle: {
          fontFamily: 'HankenGrotesk_600SemiBold',
          fontSize: 10,
          marginTop: 2,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="standouts"
        options={{
          title: 'Standouts',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'star' : 'star-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'heart' : 'heart-outline'}
              size={22}
              color={color}
              count={unreadLikes}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={22}
              color={color}
              count={unreadMessages}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
```

### StyleSheet
```javascript
badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF4D6A', borderWidth: 1.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: 'HankenGrotesk_700Bold', fontSize: 9, color: '#fff',
  }
```

---

## File: `app/index.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet`
- Hardcoded Colors: `#335CFF, #8A5BFF, #fff, #14161B`

### JSX Structure (Return blocks)
```jsx
) => clearTimeout(timer
```

```jsx
<View style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={[styles.circle, { backgroundColor: '#335CFF', left: 0 }]} />
        <View style={[styles.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
      </View>
      <Text style={styles.text}>Venn</Text>
    </View>
```

### StyleSheet
```javascript
container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoWrap: { width: 68, height: 44, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 22 },
  text: { fontSize: 26, fontWeight: '700', color: '#14161B', letterSpacing: -0.5 },
```

---

## File: `app/_layout.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, Platform`
- Hardcoded Colors: `#335CFF, #8A5BFF, #fff, #14161B`

### JSX Structure (Return blocks)
```jsx
) => { unsubscribe(
```

```jsx
) => { supabase.removeChannel(channel
```

```jsx
) => clearInterval(interval
```

```jsx
<>
      {Platform.OS === 'web' && <SpeedInsights />}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      </Stack>
      {!ready && (
        <View style={s.splash}>
          <View style={s.logoWrap}>
            <View style={[s.circle, { backgroundColor: '#335CFF', left: 0 }]} />
            <View style={[s.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
          </View>
          <Text style={s.text}>Venn</Text>
        </View>
      )}
      <MatchCelebration
        visible={incomingMatch !== null}
        matchedName={incomingMatch?.name}
        matchedPhoto={incomingMatch?.photo}
        onChat={() => {
          const d = incomingMatch;
          setIncomingMatch(null
```

### StyleSheet
```javascript
splash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoWrap: { width: 68, height: 44, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 22 },
  text: { fontSize: 26, fontWeight: '700', color: '#14161B', letterSpacing: -0.5 },
```

---

## File: `components/MatchCelebration.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Image, Animated, Dimensions,`
- Hardcoded Colors: `#335CFF, #8A5BFF, #FF4D6A, #22C55E, #FFD600, #fff`
- Fonts: `SpaceMono_400Regular, SpaceGrotesk_700Bold, HankenGrotesk_400Regular`

### JSX Structure (Return blocks)
```jsx
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
```

### StyleSheet
```javascript
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
```

---

## File: `components/OnboardingShell.jsx`

### UI Dependencies
- React Native: `View, Text, TouchableOpacity, StyleSheet, Animated`
- Fonts: `SpaceMono_400Regular`

### JSX Structure (Return blocks)
```jsx
<View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.progressTrack}>
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: pct }]} />
        </View>
        <Text style={styles.stepLabel}>STEP {step} OF {total}</Text>
      </View>

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateX: slideX }] }]}>
        {children}
      </Animated.View>

      {footer && (
        <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 24 }, { opacity, transform: [{ translateX: slideX }] }]}>
          {footer}
        </Animated.View>
      )}
    </View>
```

### StyleSheet
```javascript
container: { flex: 1, backgroundColor: colors.paper },
  topBar: { paddingHorizontal: 28, paddingTop: 14, gap: 8 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2, textAlign: 'right' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
```

---

## File: `components/PreferencesSheet.jsx`

### UI Dependencies
- React Native: `View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Dimensions, TextInput, Animated,`
- Hardcoded Colors: `#14161B, #9AA0B2, #fff, #F3EEFF, #EEF0FF, #8A5BFF, #335CFF, #E6E8EE, #F2F3F7, #F0F1F5, #F8F9FC, #5A6072, #F0F4FF`
- Fonts: `SpaceGrotesk_700Bold, HankenGrotesk_400Regular, SpaceMono_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
Array.isArray(draft[key]) ? draft[key] : []).includes(opt
```

```jsx
<Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />

        <Animated.View style={[ps.sheet, { height: SCREEN_H * 0.72, paddingBottom: insets.bottom, transform: [{ translateY: sheetY }] }]}>
          <View style={ps.handle} />

          <View style={ps.header}>
            <Text style={ps.title}>Preferences</Text>
            <TouchableOpacity style={ps.closeBtn} onPress={animateClose} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={ps.subtitle}>Set what you need — we'll show you the right matches.</Text>
          <View style={ps.headerDivider} />

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {PREF_SECTIONS.map(section => (
              <View key={section.title} style={{ paddingHorizontal: 20 }}>
                <View style={ps.sectionHeader}>
                  <Text style={ps.sectionTitle}>{section.title}</Text>
                  <View style={ps.sectionLine} />
                </View>
                {section.rows.map((row, ri) => {
                  const isOpen = openKey === row.key;
                  const display = getPrefDisplay(draft, row.key, row.placeholder, row.multi
```

```jsx
<View key={row.key}>
                      <TouchableOpacity
                        style={[ps.prefRow, !isLast && !isOpen && ps.prefRowBorder]}
                        onPress={() => setOpenKey(isOpen ? null : row.key)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={ps.prefTitle}>{row.label}</Text>
                          <Text style={[ps.prefVal, display !== row.placeholder && ps.prefValSet]}>
                            {display}
                          </Text>
                        </View>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#9AA0B2"
                        />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[ps.optsWrap, !isLast && ps.prefRowBorder]}>
                          {row.groups ? (
                            <>
                              {row.groups.map(group => (
                                <View key={group.city} style={{ width: '100%' }}>
                                  <Text style={ps.groupLabel}>{group.city}</Text>
                                  <View style={ps.groupChips}>
                                    {group.areas.map(opt => {
                                      const sel = isSelected('areas', opt, true
```

```jsx
<TouchableOpacity
                                          key={opt}
                                          style={[ps.optChip, sel && ps.optChipOn]}
                                          onPress={() => toggleOpt('areas', opt, true)}
                                          activeOpacity={0.8}
                                        >
                                          <Text style={[ps.optChipText, sel && ps.optChipTextOn]}>{opt}</Text>
                                        </TouchableOpacity>
```

```jsx
<TouchableOpacity
                                  key={opt}
                                  style={[ps.optChip, sel && ps.optChipOn]}
                                  onPress={() => toggleOpt(row.key, opt, row.multi)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[ps.optChipText, sel && ps.optChipTextOn]}>
                                    {opt}
                                  </Text>
                                </TouchableOpacity>
```

### StyleSheet
```javascript
sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    flexDirection: 'column',
  },

  handle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, fontWeight: '700', color: '#14161B' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', paddingHorizontal: 20, marginBottom: 16 },
  headerDivider: { height: 1, backgroundColor: '#F0F1F5', marginHorizontal: 0 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18, paddingBottom: 8 },
  sectionTitle: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#9AA0B2', letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#F0F1F5' },

  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  prefRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  prefTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, fontWeight: '600', color: '#14161B', marginBottom: 2 },
  prefVal: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },
  prefValSet: { color: colors.blue, fontFamily: 'HankenGrotesk_600SemiBold' },

  optsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 14 },
  optChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50,
    borderWidth: 1.5, borderColor: '#E6E8EE', backgroundColor: '#F8F9FC',
  },
  optChipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  optChipCustom: { backgroundColor: colors.violet, borderColor: colors.violet },
  optChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#5A6072' },
  optChipTextOn: { color: '#fff' },

  groupLabel: {
    fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1,
    color: '#9AA0B2', textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },

  otherChip: { borderStyle: 'dashed' },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginTop: 4 },
  otherInput: {
    flex: 1, height: 40, borderRadius: 50, borderWidth: 1.5,
    borderColor: colors.blue, paddingHorizontal: 16,
    fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink,
    backgroundColor: '#F0F4FF',
  },
  otherAddBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },

  vennPlusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 14 },
  vennPlusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vennPlusTitle: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, fontWeight: '700', color: '#8A5BFF', marginBottom: 2 },
  vennPlusSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },

  saveFooter: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#F0F1F5',
    backgroundColor: '#fff',
  },
  saveBtn: { borderRadius: 50, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff' },
```

---

## File: `components/ProfileViewSheet.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, Modal, Pressable, ScrollView, Image, TouchableOpacity`
- Hardcoded Colors: `#9AA0B2, #fff, #F8F9FF, #EDEEF2, #E6E8EE, #5A6072`
- Fonts: `SpaceGrotesk_700Bold, HankenGrotesk_600SemiBold, HankenGrotesk_400Regular`

### JSX Structure (Return blocks)
```jsx
<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[pv.sheet, { height: '92%', paddingBottom: insets.bottom + 16 }]}>
          <View style={pv.header}>
            <Text style={pv.headerTitle}>{profile.name ?? 'Profile'}</Text>
            <TouchableOpacity style={pv.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 32, gap: 10 }}>
            {photos.length > 0 ? (
              photos.map((p, i) => (
                <Image key={i} source={{ uri: p }} style={pv.photo} resizeMode="cover" />
              ))
            ) : (
              <View style={[pv.photo, { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={64} color={colors.mist} />
              </View>
            )}

            <Text style={pv.name}>{profile.name}{age ? `, ${age}` : ''}</Text>

            {(profile.gender || profile.budget || areas.length > 0 || job || edu) && (
              <View style={pv.infoCard}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: (job || edu) ? 12 : 0 }}>
                  {profile.gender ? <View style={pv.chip}><Text style={pv.chipText}>👤 {profile.gender}</Text></View> : null}
                  {profile.budget ? <View style={pv.chip}><Text style={pv.chipText}>💰 {profile.budget}</Text></View> : null}
                  {areas.length > 0 && (
                    <View style={pv.chip}><Text style={pv.chipText}>📍 {areas.join(', ')}</Text></View>
                  )}
                </View>
                {job ? (
                  <View style={[pv.infoRow, { marginBottom: edu ? 6 : 0 }]}>
                    <Ionicons name="briefcase-outline" size={15} color="#9AA0B2" />
                    <Text style={pv.infoText}>{job}</Text>
                  </View>
                ) : null}
                {edu ? (
                  <View style={pv.infoRow}>
                    <Ionicons name="school-outline" size={15} color="#9AA0B2" />
                    <Text style={pv.infoText}>{edu}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {prompts.map((pr, i) => (
              <View key={i} style={pv.promptCard}>
                <Text style={pv.promptQ}>{pr.q}</Text>
                <Text style={pv.promptA}>{pr.a}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
```

### StyleSheet
```javascript
sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'absolute', bottom: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10, paddingLeft: 20 },
  headerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: 320, borderRadius: 18 },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.ink, marginBottom: 6 },
  infoCard: { backgroundColor: '#F8F9FF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EDEEF2' },
  chip: { backgroundColor: '#fff', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E6E8EE' },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#5A6072' },
  promptCard: { backgroundColor: '#F8F9FF', borderRadius: 14, padding: 14 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#9AA0B2', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  promptA: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink, lineHeight: 22 },
```

---

## File: `components/ReportSheet.jsx`

### UI Dependencies
- React Native: `View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Animated, Dimensions, Alert,`
- Hardcoded Colors: `#14161B, #9AA0B2, #335CFF, #8A5BFF, #C8CAD2, #fff, #E6E8EE, #F2F3F7, #F0F1F5`
- Fonts: `SpaceGrotesk_700Bold, HankenGrotesk_400Regular, HankenGrotesk_700Bold`

### JSX Structure (Return blocks)
```jsx
<Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        <Animated.View style={[rs.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={rs.handle} />
          <View style={rs.header}>
            <Text style={rs.title}>Report {targetName ?? 'profile'}</Text>
            <TouchableOpacity style={rs.closeBtn} onPress={animateClose} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={rs.hint}>Your report is confidential — {targetName ?? 'they'} won't be notified.</Text>

          <View style={rs.reasons}>
            {REASONS.map(r => {
              const on = reason === r;
              return (
                <TouchableOpacity key={r} style={rs.reasonRow} onPress={() => setReason(r)} activeOpacity={0.7}>
                  <Text style={rs.reasonText}>{r}</Text>
                  <View style={[rs.radio, on && rs.radioOn]}>
                    {on && <View style={rs.radioDot} />}
                  </View>
                </TouchableOpacity>
```

### StyleSheet
```javascript
sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.8,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  handle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginBottom: 16 },

  reasons: { marginBottom: 14 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F1F5',
  },
  reasonText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#14161B' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C8CAD2', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },

  details: {
    backgroundColor: '#F2F3F7', borderRadius: 14, padding: 14, minHeight: 70,
    fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#14161B',
    textAlignVertical: 'top', marginBottom: 16,
  },

  submitBtn: { borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  submitText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' },
```

---

## File: `components/Skeleton.jsx`

### UI Dependencies
- React Native: `View, Animated, StyleSheet, Dimensions`
- Hardcoded Colors: `#E4E6EC`

### JSX Structure (Return blocks)
```jsx
) => loop.stop(
```

```jsx
<View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 12 }}>
        <View style={{ gap: 8 }}>
          <Pulse style={{ width: 140, height: 22 }} />
          <Pulse style={{ width: 90, height: 12 }} />
        </View>
        <Pulse style={{ width: 80, height: 36, borderRadius: 18 }} />
      </View>
      <Pulse style={{ width: '100%', height: 360, borderRadius: 20, marginBottom: 10 }} />
      <Pulse style={{ width: '100%', height: 64, borderRadius: 20 }} />
    </View>
```

```jsx
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: cardW }}>
          <Pulse style={{ width: '100%', height: cardW * 1.25, borderRadius: 18, marginBottom: 8 }} />
          <Pulse style={{ width: '60%', height: 14, marginBottom: 6 }} />
          <Pulse style={{ width: '40%', height: 10 }} />
        </View>
      ))}
    </View>
```

```jsx
<View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 16 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pulse style={{ width: 52, height: 52, borderRadius: 26 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Pulse style={{ width: '45%', height: 14 }} />
            <Pulse style={{ width: '75%', height: 11 }} />
          </View>
        </View>
      ))}
    </View>
```

```jsx
<View style={{ gap: 12, paddingTop: 8 }}>
      {rows.map((r, i) => (
        <Pulse
          key={i}
          style={{ width: r.w, height: 40, borderRadius: 18, alignSelf: r.mine ? 'flex-end' : 'flex-start' }}
        />
      ))}
    </View>
```

```jsx
<View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 18 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pulse style={{ width: 44, height: 44, borderRadius: 22 }} />
          <View style={{ flex: 1, gap: 7 }}>
            <Pulse style={{ width: '85%', height: 13 }} />
            <Pulse style={{ width: '30%', height: 10 }} />
          </View>
        </View>
      ))}
    </View>
```

### StyleSheet
```javascript
block: { backgroundColor: '#E4E6EC', borderRadius: 8 },
```

---

