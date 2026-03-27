import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

export default function OnboardingScreen({ user, onComplete }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const uid = user?.uid || auth.currentUser?.uid;

  const handleFinish = async () => {
    try {
      await updateDoc(doc(db, 'users', uid), { onboardingComplete: true });
    } catch (e) {
      console.warn('OnboardingScreen: could not mark onboarding complete:', e);
    }
    onComplete();
  };

  const handleNext = () => {
    const next = activeIndex + 1;
    if (next >= SLIDES.length) {
      handleFinish();
      return;
    }
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setActiveIndex(next);
  };

  const handleScroll = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

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
            {/* Decorative blobs */}
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
        {/* Dot indicators */}
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

        {/* Skip link (hidden on last slide) */}
        {!isLast && (
          <TouchableOpacity onPress={handleFinish} style={styles.skipWrapper}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Next / Let's go button */}
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: slide.accent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? "🚀 Let's go!" : 'Next'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  scroller: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  slideContent: {
    paddingHorizontal: 36,
    alignItems: 'center',
    zIndex: 2,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 28,
    textAlign: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 38,
  },
  body: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Decorative blobs
  blob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.12,
    zIndex: 1,
  },
  blobTopLeft: {
    top: -60,
    left: -60,
  },
  blobBottomRight: {
    bottom: -60,
    right: -60,
  },

  // Controls overlay
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: Platform.OS === 'ios' ? 50 : 36,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  skipWrapper: {
    marginBottom: 16,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
