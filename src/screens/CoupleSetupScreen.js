import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createInviteCode, joinCouple, setAnniversary, completeInviteHandshake } from '../services/couple';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { colors, gradients } from '../theme/colors';

// ──────────────────────────────────────────────────────────────
// Screens / steps
//  'choose'     → pick "Generate code" vs "Enter code"
//  'generate'   → show the user's code (share with partner)
//  'enter'      → input partner's code
//  'anniversary'→ optional anniversary date picker (after linking)
// ──────────────────────────────────────────────────────────────

export default function CoupleSetupScreen({ user, onLinked }) {
  const [screen,      setScreen]      = useState('choose');
  const [loading,     setLoading]     = useState(false);

  // Generate flow
  const [myCode,      setMyCode]      = useState('');

  // Enter flow
  const [inputCode,   setInputCode]   = useState('');

  // Anniversary flow
  const [coupleId,    setCoupleId]    = useState('');
  const [anniversary, setAnniversaryDate] = useState(new Date());
  const [showPicker,  setShowPicker]  = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);

  // ── Watch for partner joining (only active on 'generate' screen) ──
  useEffect(() => {
    if (screen !== 'generate' || !myCode || !user?.uid) return;

    // Listen to the inviteCodes/{myCode} doc.
    // When User B joins they write { joinerUid, coupleId } there.
    // We then write coupleId to our OWN user doc (can't cross-write user docs)
    // and delete the now-used invite code.
    const unsubscribe = onSnapshot(doc(db, 'inviteCodes', myCode), async (snap) => {
      const data = snap.data();
      if (data?.joinerUid && data?.coupleId) {
        unsubscribe(); // stop listening regardless of outcome
        try {
          // Critical: write coupleId to our own user doc first.
          // Only advance the screen if this succeeds — otherwise the user
          // would appear linked in UI but be locked out after any restart.
          await completeInviteHandshake(user.uid, myCode, data.coupleId);
          setCoupleId(data.coupleId);
          setIsInitiator(true);
          setScreen('anniversary');
        } catch (e) {
          // Handshake failed — stay on generate screen and alert the user
          Alert.alert(
            'Connection error 😕',
            'Your partner joined but we couldn\'t save the link. Please check your connection and try again.',
          );
        }
      }
    });

    return () => unsubscribe();
  }, [screen, myCode, user?.uid]);

  // ── Generate a code ──────────────────────────────────────────
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const code = await createInviteCode(user.uid);
      setMyCode(code);
      setScreen('generate');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Join with partner's code ─────────────────────────────────
  const handleJoin = async () => {
    if (inputCode.trim().length < 6)
      return Alert.alert('Code required', 'Please enter the full 6-character code.');

    setLoading(true);
    try {
      const result = await joinCouple(user.uid, inputCode);
      setCoupleId(result.coupleId);
      setIsInitiator(false);
      setScreen('anniversary');
    } catch (e) {
      Alert.alert('Invalid code 😕', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Save anniversary and finish ──────────────────────────────
  const handleFinish = async (skip = false) => {
    setLoading(true);
    try {
      if (!skip) await setAnniversary(coupleId, anniversary);
      onLinked(coupleId);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(myCode);
    Alert.alert('Copied! 📋', `Share the code "${myCode}" with your partner.`);
  };

  // ── Choose screen ────────────────────────────────────────────
  if (screen === 'choose') {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <Animated.View entering={FadeInDown.duration(700)} style={styles.centerBlock}>
          <Text style={styles.heroEmoji}>🔗</Text>
          <Text style={styles.heroTitle}>Connect with your partner</Text>
          <Text style={styles.heroSub}>
            One of you generates a code, the other enters it.
            You only need to do this once.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(700)} style={styles.choiceRow}>
          {/* Generate */}
          <TouchableOpacity style={styles.choiceCard} onPress={handleGenerate} disabled={loading}>
            <LinearGradient
              colors={['rgba(233,64,87,0.18)', 'rgba(138,35,135,0.10)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <Text style={styles.choiceEmoji}>📲</Text>
            <Text style={styles.choiceTitle}>Generate{'\n'}my code</Text>
            <Text style={styles.choiceSub}>Share it with your partner</Text>
          </TouchableOpacity>

          {/* Enter */}
          <TouchableOpacity style={styles.choiceCard} onPress={() => setScreen('enter')} disabled={loading}>
            <LinearGradient
              colors={['rgba(242,113,33,0.18)', 'rgba(233,64,87,0.10)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            <Text style={styles.choiceEmoji}>🔑</Text>
            <Text style={styles.choiceTitle}>Enter partner's{'\n'}code</Text>
            <Text style={styles.choiceSub}>Your partner has a code for you</Text>
          </TouchableOpacity>
        </Animated.View>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
      </LinearGradient>
    );
  }

  // ── Generate screen ──────────────────────────────────────────
  if (screen === 'generate') {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.centerBlock}>
          <Text style={styles.heroEmoji}>📲</Text>
          <Text style={styles.heroTitle}>Your invite code</Text>
          <Text style={styles.heroSub}>
            Share this code with your partner. It expires once used.
          </Text>

          <TouchableOpacity onPress={copyCode} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={styles.codeBox}>
              <LinearGradient
                colors={['rgba(233,64,87,0.18)', 'rgba(138,35,135,0.10)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
              />
              <Text style={styles.codeText}>{myCode}</Text>
              <View style={styles.copyRow}>
                <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.copyLabel}>Tap to copy</Text>
              </View>
            </BlurView>
          </TouchableOpacity>

          <Text style={styles.waitingText}>
            ⏳ Waiting for your partner to enter this code…{'\n'}
            The app will jump forward automatically the moment they join.
          </Text>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setScreen('choose')}>
            <Text style={styles.secondaryBtnText}>← Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // ── Enter code screen ────────────────────────────────────────
  if (screen === 'enter') {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.centerBlock}>
          <Text style={styles.heroEmoji}>🔑</Text>
          <Text style={styles.heroTitle}>Enter the code</Text>
          <Text style={styles.heroSub}>Ask your partner to open the app and share their 6-character code.</Text>

          <View style={styles.field}>
            <Ionicons name="key-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { letterSpacing: 6, fontSize: 22, fontWeight: '800' }]}
              placeholder="A B C 1 2 3"
              placeholderTextColor="#444"
              value={inputCode}
              onChangeText={(t) => setInputCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleJoin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={gradients.love} style={StyleSheet.absoluteFill} />
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Connect 💕</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setScreen('choose')}>
            <Text style={styles.secondaryBtnText}>← Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // ── Anniversary screen ───────────────────────────────────────
  if (screen === 'anniversary') {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.centerBlock}>
          <Text style={styles.heroEmoji}>🗓️</Text>
          <Text style={styles.heroTitle}>You're connected! 🎉</Text>
          <Text style={styles.heroSub}>
            When did your story begin? (You can always change this in Settings.)
          </Text>

          {isInitiator ? (
            <>
              {!showPicker ? (
                <TouchableOpacity style={styles.field} onPress={() => setShowPicker(true)}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.input, { paddingTop: Platform.OS === 'ios' ? 14 : 0, color: '#fff' }]}>
                    {anniversary.toDateString()}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={anniversary}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    textColor="#fff"
                    onChange={(_, d) => {
                      if (Platform.OS === 'android') setShowPicker(false);
                      if (d) setAnniversaryDate(d);
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.confirmBtn}>
                      <Text style={styles.confirmBtnText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => handleFinish(false)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={gradients.love} style={StyleSheet.absoluteFill} />
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>Let's go! 🚀</Text>
                }
              </TouchableOpacity>

            </>
          ) : (
            <>
              <View style={styles.infoCard}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>💑</Text>
                <Text style={styles.infoTitle}>You're all set!</Text>
                <Text style={styles.infoBody}>
                  Your partner will set the anniversary date. You can both update it later from Settings.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => handleFinish(true)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={gradients.love} style={StyleSheet.absoluteFill} />
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>Continue 💕</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </LinearGradient>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },

  centerBlock: {
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 58, marginBottom: 14 },
  heroTitle: {
    color: '#fff', fontSize: 26, fontWeight: '800',
    textAlign: 'center', marginBottom: 12,
  },
  heroSub: {
    color: colors.textSecondary, fontSize: 15,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },

  // Two-column choice
  choiceRow: {
    flexDirection: 'row', paddingHorizontal: 20,
    gap: 14, justifyContent: 'center',
  },
  choiceCard: {
    flex: 1, borderRadius: 22, padding: 22,
    alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 170,
  },
  choiceEmoji:  { fontSize: 36, marginBottom: 10 },
  choiceTitle:  { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  choiceSub:    { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },

  // Code box
  codeBox: {
    borderRadius: 20, paddingVertical: 28, paddingHorizontal: 40,
    alignItems: 'center', marginBottom: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(233,64,87,0.3)',
  },
  codeText: {
    fontSize: 38, fontWeight: '800', color: '#fff',
    letterSpacing: 10, marginBottom: 10,
  },
  copyRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyLabel: { color: colors.textSecondary, fontSize: 12 },

  waitingText: {
    color: colors.textSecondary, fontSize: 14,
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  // Field
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 16, height: 56,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16, width: '100%',
  },
  input: { flex: 1, color: '#fff', fontSize: 16 },

  // Submit
  submitBtn: {
    height: 52, borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    width: '100%', marginBottom: 14,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Secondary back button
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 14 },

  // Date picker
  pickerWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 10, marginBottom: 20,
    width: '100%', alignItems: 'center',
  },
  confirmBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 8, marginTop: 10,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700' },

  // Info card (joiner view on anniversary screen)
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    width: '100%',
  },
  infoTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  infoBody:  { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
