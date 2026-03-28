import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '💑',
    title: 'Your love, always connected',
    body: 'Loovy keeps you and your partner in sync no matter the distance. Share moods, locations, and moments — in real time.',
    gradient: ['#0f0c29', '#302b63', '#24243e'],
    accent: '#e94057',
  },
  {
    emoji: '🌍',
    title: "See each other's world",
    body: "Know where your partner is, what time it is for them, and feel a little closer — even when oceans apart.",
    gradient: ['#1a1a2e', '#16213e', '#0f3460'],
    accent: '#f5a623',
  },
  {
    emoji: '📸',
    title: 'Cherish every memory',
    body: 'Build a shared timeline of your relationship — photos, emojis, stories. Your love story, in one place.',
    gradient: ['#12001f', '#2d1b5e', '#1a0533'],
    accent: '#a855f7',
  },
  {
    emoji: '💌',
    title: 'Send love across time',
    body: 'Lock a heartfelt message in a Time Capsule and set it to open on a special date. A surprise waiting to be unwrapped.',
    gradient: ['#0f0c29', '#302b63', '#24243e'],
    accent: '#e94057',
  },
];

const EMOJI_AVATARS = ['🐼', '🦊', '🐻', '🐱', '🐶', '🦁', '🐸', '🐨', '🦋', '🌸', '🌙', '⭐', '🌈', '❤️', '🫶'];

export default function OnboardingScreen({ user, onComplete }) {
  const scrollRef    = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Profile setup step (shown after last slide)
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [avatarUri,  setAvatarUri]  = useState(null);
  const [avatarEmoji, setAvatarEmoji] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const uid = user?.uid || auth.currentUser?.uid;

  const handleFinish = async (pickedAvatarUri = null, pickedEmoji = null) => {
    try {
      const updates = { onboardingComplete: true };
      if (pickedAvatarUri) updates.avatarUrl   = pickedAvatarUri;
      if (pickedEmoji)     updates.avatarEmoji  = pickedEmoji;
      await updateDoc(doc(db, 'users', uid), updates);
    } catch (e) {
      console.warn('OnboardingScreen: could not mark onboarding complete:', e);
    }
    onComplete();
  };

  const handleNext = () => {
    const next = activeIndex + 1;
    if (next >= SLIDES.length) {
      // Show profile setup step instead of finishing immediately
      setShowProfileSetup(true);
      return;
    }
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setActiveIndex(next);
  };

  const handleScroll = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
      setAvatarEmoji(null);
    }
  };

  const pickEmoji = (em) => {
    setAvatarEmoji(em);
    setAvatarUri(null);
  };

  const handleSaveProfile = async () => {
    setSavingAvatar(true);
    await handleFinish(avatarUri, avatarEmoji);
    setSavingAvatar(false);
  };

  const isLast = activeIndex === SLIDES.length - 1;
  const slide  = SLIDES[activeIndex];

  // ── Profile setup screen ─────────────────────────────────────
  if (showProfileSetup) {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.profileRoot}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.profileContent}>
          <Text style={styles.profileEmoji}>🤳</Text>
          <Text style={styles.profileTitle}>Set your profile picture</Text>
          <Text style={styles.profileSub}>
            Your partner will see this on their home screen. Pick a photo or an emoji — you can change it any time in Settings.
          </Text>

          {/* Preview */}
          <TouchableOpacity onPress={pickImage} style={styles.avatarPreview} activeOpacity={0.8}>
            {avatarEmoji ? (
              <View style={styles.emojiAvatarLarge}>
                <Text style={{ fontSize: 60 }}>{avatarEmoji}</Text>
              </View>
            ) : avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 40 }}>📷</Text>
                <Text style={styles.avatarPlaceholderText}>Tap to pick a photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Emoji grid */}
          <Text style={styles.orLabel}>— or pick an emoji —</Text>
          <View style={styles.emojiGrid}>
            {EMOJI_AVATARS.map(em => (
              <TouchableOpacity
                key={em}
                style={[styles.emojiTile, avatarEmoji === em && styles.emojiTileSelected]}
                onPress={() => pickEmoji(em)}
              >
                <Text style={{ fontSize: 28 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveProfile}
            disabled={savingAvatar}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#e94057', '#8a2387']} style={StyleSheet.absoluteFill} />
            <Text style={styles.saveBtnText}>
              {savingAvatar ? 'Saving…' : (avatarUri || avatarEmoji) ? "Let's go! 🚀" : 'Skip for now →'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // ── Slides ───────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroller}
      >
        {SLIDES.map((s, i) => (
          <LinearGradient key={i} colors={s.gradient} style={styles.slide}>
            <View style={[styles.blob, styles.blobTopLeft,  { backgroundColor: s.accent }]} />
            <View style={[styles.blob, styles.blobBottomRight, { backgroundColor: s.accent }]} />

            <Animated.View entering={FadeInDown.delay(100)} style={styles.slideContent}>
              <Text style={styles.emoji}>{s.emoji}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </Animated.View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <LinearGradient
        colors={['transparent', slide.gradient[slide.gradient.length - 1]]}
        style={styles.controls}
        pointerEvents="box-none"
      >
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? s.accent : 'rgba(255,255,255,0.3)',
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {!isLast && (
          <TouchableOpacity onPress={() => setShowProfileSetup(true)} style={styles.skipWrapper}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: slide.accent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? '✨ Set up my profile' : 'Next'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  scroller: { flex: 1 },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  slideContent: { paddingHorizontal: 36, alignItems: 'center', zIndex: 2 },
  emoji: { fontSize: 80, marginBottom: 28, textAlign: 'center' },
  title: {
    fontSize: 30, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginBottom: 18, lineHeight: 38,
  },
  body: { fontSize: 17, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },

  blob: {
    position: 'absolute', width: 220, height: 220,
    borderRadius: 110, opacity: 0.12, zIndex: 1,
  },
  blobTopLeft:     { top: -60,  left: -60  },
  blobBottomRight: { bottom: -60, right: -60 },

  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 60,
    paddingBottom: Platform.OS === 'ios' ? 50 : 36,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 6 },
  dot:  { height: 8, borderRadius: 4 },
  skipWrapper: { marginBottom: 16 },
  skipText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    width: '100%', paddingVertical: 18, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // ── Profile setup screen ─────────────────────────────────
  profileRoot: { flex: 1 },
  profileContent: {
    flex: 1, paddingHorizontal: 28, paddingTop: 80,
    paddingBottom: 40, alignItems: 'center',
  },
  profileEmoji: { fontSize: 56, marginBottom: 16 },
  profileTitle: {
    color: '#fff', fontSize: 26, fontWeight: '800',
    textAlign: 'center', marginBottom: 12,
  },
  profileSub: {
    color: 'rgba(255,255,255,0.6)', fontSize: 15,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },

  avatarPreview: { marginBottom: 20 },
  emojiAvatarLarge: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#e94057',
  },
  avatarImage: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderColor: '#e94057',
  },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    textAlign: 'center', marginTop: 4,
  },

  orLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 13,
    marginVertical: 16,
  },

  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 8, marginBottom: 28,
  },
  emojiTile: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  emojiTileSelected: {
    borderColor: '#e94057',
    backgroundColor: 'rgba(233,64,87,0.15)',
  },

  saveBtn: {
    height: 54, width: '100%', borderRadius: 18, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
