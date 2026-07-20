import React from 'react';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { colors } from '../utils/theme';

// Simple, recognizable equipment silhouettes instead of abstract geometric
// muscle-group shapes — a barbell reads as "barbell" at a glance, which the
// previous double-loop/split-triangle icons didn't.

const STROKE = colors.accent;
const SW = 1.7;

function BarbellIcon({ size }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Line x1="6.5" y1="12" x2="17.5" y2="12" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <Rect x="4.5" y="8.5" width="2.4" height="7" rx="1" fill={STROKE} />
      <Rect x="17.1" y="8.5" width="2.4" height="7" rx="1" fill={STROKE} />
      <Rect x="1.5" y="10" width="2" height="4" rx="0.8" fill={STROKE} />
      <Rect x="20.5" y="10" width="2" height="4" rx="0.8" fill={STROKE} />
    </Svg>
  );
}

function DumbbellIcon({ size }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Line x1="9" y1="12" x2="15" y2="12" stroke={STROKE} strokeWidth={2.2} strokeLinecap="round" />
      <Rect x="3" y="7.5" width="4.5" height="9" rx="1.6" fill={STROKE} />
      <Rect x="16.5" y="7.5" width="4.5" height="9" rx="1.6" fill={STROKE} />
    </Svg>
  );
}

// Cable pulley — used for both "Cable" and "Machine" equipment types.
function CablePulleyIcon({ size }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx="12" cy="6.5" r="3" stroke={STROKE} strokeWidth={SW} />
      <Line x1="12" y1="9.5" x2="12" y2="15.5" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="15.5" x2="7.5" y2="20.5" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="15.5" x2="16.5" y2="20.5" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function BodyweightIcon({ size }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx="12" cy="4.8" r="2.2" stroke={STROKE} strokeWidth={SW} />
      <Line x1="12" y1="7" x2="12" y2="14.5" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="9.5" x2="7" y2="12.5" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="9.5" x2="17" y2="12.5" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="14.5" x2="7.5" y2="21" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="14.5" x2="16.5" y2="21" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

const ICONS = {
  Barbell: BarbellIcon,
  Dumbbell: DumbbellIcon,
  Cable: CablePulleyIcon,
  Machine: CablePulleyIcon,
  Bodyweight: BodyweightIcon,
};

// Accepts an exercise's `equipment` field. `muscle` is still accepted as a
// fallback for any call site not yet updated, but equipment is preferred
// since it maps to a recognizable real-world object.
export default function MuscleIcon({ equipment, muscle, size = 28 }) {
  const Icon = ICONS[equipment] || ICONS[muscle] || DumbbellIcon;
  return <Icon size={size} />;
}
