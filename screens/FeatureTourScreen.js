import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { PrimaryButton } from '../components/UI';
import { colors, spacing, radius, fonts } from '../utils/theme';
import { setHasSeenTour } from '../utils/storage';

// First-run value carousel. Shown once (gated on hasSeenTour) before the
// sign-in gate, so a new user sees WHAT they get before being asked to commit
// to an account. Skippable from the first screen; four value-framed slides.
//
// Deliberately asset-free — each slide uses a tinted Feather icon rather than
// an illustration, so it themes cleanly and adds no bundle weight.
const SLIDES = [
  {
    icon: 'zap',
    tint: colors.accent,
    title: 'Log in two taps',
    body: 'Weights and reps come pre-filled from your last session. Adjust, tap done, move on.',
  },
  {
    icon: 'trending-up',
    tint: '#60A5FA',
    title: 'Beat last week, automatically',
    body: 'Every session gives you a target that nudges up — real progressive overload, no spreadsheet.',
  },
  {
    icon: 'grid',
    tint: '#34D399',
    title: 'Never break the chain',
    body: 'A streak calendar rewards showing up. Watch the grid fill in, week after week.',
  },
  {
    icon: 'award',
    tint: colors.gold,
    title: 'Chase real milestones',
    body: 'The 100kg Bench Club. A 2× bodyweight deadlift. Records for your biggest weeks. Go earn them.',
  },
];

export default function FeatureTourScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  async function finish() {
    await setHasSeenTour(true);
    navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  }

  function handleNext() {
    if (isLast) {
      finish();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }

  function handleScroll(e) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={finish} hitSlop={12} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { borderColor: slide.tint }]}>
              <View style={[styles.iconGlow, { backgroundColor: slide.tint }]} />
              <Feather name={slide.icon} size={56} color={slide.tint} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.title}
              style={[styles.dot, i === index ? styles.dotActive : null]}
            />
          ))}
        </View>
        <PrimaryButton
          title={isLast ? 'Get Started' : 'Next'}
          onPress={handleNext}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.sm,
  },
  skipBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  skipText: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 15 },
  pager: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 128,
    height: 128,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconGlow: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: radius.full,
    opacity: 0.12,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    includeFontPadding: false,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 360,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
    paddingTop: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 22,
  },
});
