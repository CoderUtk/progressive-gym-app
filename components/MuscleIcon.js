import React from 'react';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { colors, muscleTint } from '../utils/theme';

// Recognizable equipment silhouettes tinted by muscle group. Shape says HOW
// you do it (barbell / dumbbell / cable / bodyweight), color says WHAT it
// hits (chest = coral, back = blue, legs = emerald, etc.) so a scan of the
// library reads as clusters instead of a wall of identical mint icons.

const SW = 1.7;

function BarbellIcon({ size, stroke }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Line x1="6.5" y1="12" x2="17.5" y2="12" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Rect x="4.5" y="8.5" width="2.4" height="7" rx="1" fill={stroke} />
      <Rect x="17.1" y="8.5" width="2.4" height="7" rx="1" fill={stroke} />
      <Rect x="1.5" y="10" width="2" height="4" rx="0.8" fill={stroke} />
      <Rect x="20.5" y="10" width="2" height="4" rx="0.8" fill={stroke} />
    </Svg>
  );
}

function DumbbellIcon({ size, stroke }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Line x1="9" y1="12" x2="15" y2="12" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Rect x="3" y="7.5" width="4.5" height="9" rx="1.6" fill={stroke} />
      <Rect x="16.5" y="7.5" width="4.5" height="9" rx="1.6" fill={stroke} />
    </Svg>
  );
}

function CablePulleyIcon({ size, stroke }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx="12" cy="6.5" r="3" stroke={stroke} strokeWidth={SW} />
      <Line x1="12" y1="9.5" x2="12" y2="15.5" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="15.5" x2="7.5" y2="20.5" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="15.5" x2="16.5" y2="20.5" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function BodyweightIcon({ size, stroke }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx="12" cy="4.8" r="2.2" stroke={stroke} strokeWidth={SW} />
      <Line x1="12" y1="7" x2="12" y2="14.5" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="9.5" x2="7" y2="12.5" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="9.5" x2="17" y2="12.5" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="14.5" x2="7.5" y2="21" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="14.5" x2="16.5" y2="21" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function CardioIcon({ size, stroke }) {
  // Simple running figure — cardio equipment (treadmill/bike/rower) all get
  // this since the equipment silhouettes would be too niche to recognize.
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx="15" cy="5.5" r="2" stroke={stroke} strokeWidth={SW} />
      <Line x1="15" y1="7.5" x2="11" y2="13" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="11" y1="13" x2="6" y2="12" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="11" y1="13" x2="15" y2="15" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="11" y1="13" x2="9" y2="19" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="15" y1="15" x2="19" y2="20" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

const ICONS = {
  Barbell: BarbellIcon,
  Dumbbell: DumbbellIcon,
  Cable: CablePulleyIcon,
  Machine: CablePulleyIcon,
  Bodyweight: BodyweightIcon,
  Treadmill: CardioIcon,
  Bike: CardioIcon,
  Rower: CardioIcon,
  Stairmaster: CardioIcon,
  Rope: CardioIcon,
};

export default function MuscleIcon({ equipment, muscle, size = 28 }) {
  const Icon = ICONS[equipment] || ICONS[muscle] || DumbbellIcon;
  // muscle tint drives the stroke color; falls back to accent green when
  // muscle is unknown (e.g. a legacy call site that only passes equipment).
  const stroke = muscle ? muscleTint(muscle) : colors.accent;
  return <Icon size={size} stroke={stroke} />;
}
