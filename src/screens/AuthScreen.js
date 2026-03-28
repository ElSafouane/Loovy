import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { signIn, signUp, resetPassword, signInWithGoogle } from '../services/auth';
import { colors, gradients } from '../theme/colors';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode]           = useState('login'); // 'login' | 'register'
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  // ── Google Sign-In (only shown when client ID is configured) ──
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const { id_token } = googleResponse.params;
    setLoading(true);
    signInWithGoogle(id_token)
      .then(user => onAuthenticated(user))
      .catch(e  => Alert.alert('Google Sign-In failed', e.message))
      .finally(() => setLoading(false));
  }, [googleResponse]);

  const isRegister = mode === 'register';

  const handleSubmit = async () => {
    if (isRegister && !name.trim())
      return Alert.alert('Your name', 'Please tell us your name 😊');
    if (!email.trim())
      return Alert.alert('Email', 'Please enter your email.');
    if (password.length < 6)
      return Alert.alert('Password', 'Password must be at least 6 characters.');

    setLoading(true);
    try {
      const user = isRegister
        ? await signUp(name.trim(), email.trim(), password)
        : await signIn(email.trim(), password);
      // Pass the Firebase user directly — no need for auth.currentUser in App.js
      onAuthenticated(user);
    } catch (e) {
      const msg = e.code === 'auth/email-already-in-use' ? 'This email is already registered. Try signing in.'
        : e.code === 'auth/user-not-found'               ? 'No account found with this email.'
        : e.code === 'auth/wrong-password'               ? 'Incorrect password.'
        : e.code === 'auth/invalid-email'                ? 'Please enter a valid email address.'
        : e.message;
      Alert.alert('Oops 😕', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) return Alert.alert('Email', 'Enter your email above first.');
    try {
      await resetPassword(email.trim());
      Alert.alert('Email sent 📩', 'Check your inbox for a password-reset link.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View entering={FadeInDown.duration(700)} style={styles.logoBlock}>
            <Text style={styles.logoEmoji}>💕</Text>
            <Text style={styles.logoTitle}>Loovy</Text>
            <Text style={styles.logoSub}>Stay close, no matter the distance</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View entering={FadeInUp.delay(200).duration(700)}>
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                style={StyleSheet.absoluteFill}
              />

              {/* Mode toggle */}
              <View style={styles.modeRow}>
                {['login', 'register'].map((m) => {
                  const active = mode === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modeBtn, active && styles.modeBtnActive]}
                      onPress={() => setMode(m)}
                    >
                      {active && (
                        <LinearGradient
                          colors={gradients.active}
                          style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                        />
                      )}
                      <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>
                        {m === 'login' ? 'Sign In' : 'Create Account'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Name (register only) */}
              {isRegister && (
                <View style={styles.field}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Your first name"
                    placeholderTextColor="#666"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              )}

              {/* Email */}
              <View style={styles.field}>
                <Ionicons name="mail-outline" size={18} color={colors.primary} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.primary} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password (min 6 chars)"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot password (login only) */}
              {!isRegister && (
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={gradients.love} style={StyleSheet.absoluteFill} />
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>
                      {isRegister ? 'Create Account ✨' : 'Sign In 💕'}
                    </Text>
                }
              </TouchableOpacity>

              {/* ── Social sign-in ── */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign-In — only shown when iOS client ID is configured */}
              {!!googleClientId && (
                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={() => promptGoogleAsync()}
                  disabled={!googleRequest || loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </TouchableOpacity>
              )}

            </BlurView>
          </Animated.View>

          {/* Privacy note */}
          <Animated.View entering={FadeInUp.delay(400).duration(700)}>
            <Text style={styles.privacyNote}>
              🔒 Your messages and memories are private to your couple only.
            </Text>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 80, paddingBottom: 40 },

  // Logo
  logoBlock: { alignItems: 'center', marginBottom: 36 },
  logoEmoji: { fontSize: 56, marginBottom: 10 },
  logoTitle: { fontSize: 38, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  logoSub:   { fontSize: 15, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },

  // Card
  card: {
    borderRadius: 28, padding: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 24,
  },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 4, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modeBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderRadius: 12, overflow: 'hidden',
  },
  modeBtnActive: {},
  modeBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  modeBtnTextActive: { color: '#fff', fontWeight: '700' },

  // Fields
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 14,
    height: 52, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 4 },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 4 },
  forgotText: { color: colors.textSecondary, fontSize: 13 },

  // Submit
  submitBtn: {
    height: 52, borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: 'rgba(255,255,255,0.4)', marginHorizontal: 12, fontSize: 13 },

  // Google
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  googleIcon:    { color: '#fff', fontSize: 18, fontWeight: '900', marginRight: 10 },
  googleBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Privacy
  privacyNote: {
    color: colors.textSecondary, fontSize: 13,
    textAlign: 'center', lineHeight: 20,
  },
});
