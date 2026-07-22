// Premium dark-mode token set.
export const colors = {
  bg: '#0B0E11',            // Deep midnight, subtle teal tint
  card: '#151A21',           // Elevated dark slate
  cardAlt: '#1C222C',        // Secondary elevated surface
  border: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(62,224,158,0.35)',
  activeTint: 'rgba(62,224,158,0.05)',
  text: '#FFFFFF',
  muted: '#94A3B8',          // secondary text / labels
  mutedDim: '#64748B',       // captions
  accent: '#3EE09E',         // primary mint
  accentDim: '#2BB980',      // secondary emerald
  ctaText: '#0B0E11',
  danger: '#FF5A5F',
  gold: '#F5C542',
};

// Gradient stops for primary CTAs — used with expo-linear-gradient where
// available; solid `accent` is the fallback.
export const gradients = {
  primaryCTA: [colors.accent, colors.accentDim],
};

export const shadows = {
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

// Per-muscle-group tint. Used to color exercise icons so a chest lift feels
// visually distinct from a back lift at a glance — the icon shape (equipment
// silhouette) tells you HOW you're doing it, the tint tells you WHAT it hits.
// Chosen to be readable on the dark card bg without clashing with the accent.
export const muscleTints = {
  Chest:     '#F87171', // coral red
  Back:      '#60A5FA', // sky blue
  Legs:      '#34D399', // emerald
  Shoulders: '#A78BFA', // violet
  Arms:      '#FBBF24', // amber
  Core:      '#22D3EE', // cyan
  Cardio:    '#F472B6', // pink
};

export function muscleTint(muscle) {
  return muscleTints[muscle] || colors.accent;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 14, lg: 16, full: 999 };
