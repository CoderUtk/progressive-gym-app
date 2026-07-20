import { TRACKING } from '../data/exercises';
import { formatWeight, displayWeight } from './units';

// One-liner text summary of a logged set, keyed off the exercise's tracking
// type. The workout logger, history entries, and the share card all render
// through this so the format stays consistent everywhere.
export function formatSet(exercise, set, unit = 'kg') {
  const type = exercise?.tracking_type || TRACKING.WEIGHT_REPS;
  switch (type) {
    case TRACKING.WEIGHT_REPS:
      return `${formatWeight(set.weight, unit)} × ${set.reps}`;
    case TRACKING.BODYWEIGHT_REPS: {
      const added = set.addedWeight || 0;
      if (added === 0) return `BW × ${set.reps}`;
      const sign = added > 0 ? '+' : '−';
      return `BW ${sign}${formatWeight(Math.abs(added), unit)} × ${set.reps}`;
    }
    case TRACKING.TIMED_HOLD:
      return formatDuration(set.durationSec || 0);
    case TRACKING.CARDIO: {
      const parts = [];
      if (set.distance) parts.push(`${set.distance} ${set.distanceUnit || 'km'}`);
      if (set.durationSec) parts.push(`in ${formatDuration(set.durationSec)}`);
      const pace = computePace(set);
      if (pace) parts.push(`(${pace})`);
      if (parts.length === 0 && set.level) parts.push(`Level ${set.level}`);
      return parts.join(' ');
    }
    default:
      return '—';
  }
}

// Short label used where space is tight (e.g. share card highlight rows).
export function formatSetTight(exercise, set, unit = 'kg') {
  const type = exercise?.tracking_type || TRACKING.WEIGHT_REPS;
  if (type === TRACKING.CARDIO) {
    if (set.distance) return `${set.distance}${set.distanceUnit || 'km'} · ${formatDuration(set.durationSec || 0)}`;
    return formatDuration(set.durationSec || 0);
  }
  return formatSet(exercise, set, unit);
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

// Pace as "MM:SS /km" (or /mi). Returns null if either side is missing so the
// caller can gate rendering off truthiness.
export function computePace(set) {
  const dist = Number(set.distance);
  const dur = Number(set.durationSec);
  if (!dist || dist <= 0 || !dur || dur <= 0) return null;
  const secPerUnit = dur / dist;
  const mm = Math.floor(secPerUnit / 60);
  const ss = Math.round(secPerUnit % 60);
  const unit = set.distanceUnit === 'mi' ? 'mi' : 'km';
  return `${mm}:${String(ss).padStart(2, '0')} /${unit}`;
}

// Volume in kg for aggregate totals (Profile / Analytics / share card).
// Bodyweight sets use profile.weight as the effective load; timed and cardio
// contribute zero mass — they're counted as sets, not kg.
export function volumeForSet(exercise, set, bodyweightKg = 70) {
  const type = exercise?.tracking_type || TRACKING.WEIGHT_REPS;
  switch (type) {
    case TRACKING.WEIGHT_REPS:
      return (set.weight || 0) * (set.reps || 0);
    case TRACKING.BODYWEIGHT_REPS:
      return Math.max(0, bodyweightKg + (set.addedWeight || 0)) * (set.reps || 0);
    default:
      return 0;
  }
}

// A fresh "current" input state for a given exercise. The logger seeds its
// active-set form from this whenever the user swaps exercises or advances.
export function defaultCurrentFor(exercise, suggestion, unit = 'kg') {
  const type = exercise?.tracking_type || TRACKING.WEIGHT_REPS;
  const base = { type: 'N' };
  switch (type) {
    case TRACKING.WEIGHT_REPS:
      return {
        ...base,
        weight: displayWeight(suggestion?.weight ?? 20, unit),
        reps: suggestion?.reps ?? 8,
      };
    case TRACKING.BODYWEIGHT_REPS:
      return { ...base, reps: suggestion?.reps ?? 8, addedWeight: 0 };
    case TRACKING.TIMED_HOLD:
      return { ...base, durationSec: suggestion?.durationSec ?? 30 };
    case TRACKING.CARDIO:
      return {
        ...base,
        durationSec: suggestion?.durationSec ?? 20 * 60,
        distance: suggestion?.distance ?? '',
        distanceUnit: suggestion?.distanceUnit ?? 'km',
        level: suggestion?.level ?? '',
        incline: '',
        calories: '',
        heartRate: '',
        primaryMode: suggestion?.primaryMode ?? 'distance', // 'distance' | 'level'
      };
    default:
      return base;
  }
}

// Coerce the current-form state into what actually gets stored on the set,
// normalized (numbers coerced, blanks dropped). Called on Log Set.
export function commitSet(exercise, current, ctx) {
  const type = exercise?.tracking_type || TRACKING.WEIGHT_REPS;
  switch (type) {
    case TRACKING.WEIGHT_REPS: {
      const rawKg = ctx.toKg(current.weight);
      return { weight: ctx.roundIncrement(rawKg), reps: Number(current.reps) || 0, type: current.type };
    }
    case TRACKING.BODYWEIGHT_REPS:
      return {
        reps: Number(current.reps) || 0,
        addedWeight: Number(current.addedWeight) || 0,
        type: current.type,
      };
    case TRACKING.TIMED_HOLD:
      return { durationSec: Number(current.durationSec) || 0, type: current.type };
    case TRACKING.CARDIO:
      return {
        durationSec: Number(current.durationSec) || 0,
        distance: current.distance !== '' ? Number(current.distance) : null,
        distanceUnit: current.distanceUnit || 'km',
        level: current.level !== '' ? Number(current.level) : null,
        incline: current.incline !== '' ? Number(current.incline) : null,
        calories: current.calories !== '' ? Number(current.calories) : null,
        heartRate: current.heartRate !== '' ? Number(current.heartRate) : null,
        type: current.type,
      };
    default:
      return current;
  }
}

export function isCardio(exercise) {
  return exercise?.tracking_type === TRACKING.CARDIO;
}
