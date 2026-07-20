const KG_PER_LB = 0.45359237;

export function kgToLb(kg) {
  return kg / KG_PER_LB;
}

export function lbToKg(lb) {
  return lb * KG_PER_LB;
}

// Weights are always stored in kg internally. This converts a stored kg
// value to whatever unit the user has chosen, for display only.
export function displayWeight(kg, unit) {
  if (kg == null || Number.isNaN(kg)) return null;
  const val = unit === 'lb' ? kgToLb(kg) : kg;
  return Math.round(val * 100) / 100;
}

// Snap a display value to the nearest loadable plate step. Prevents oddities
// like "20.8kg" leaking through after a unit conversion or from older data
// that predates per-set rounding.
function snapToIncrement(val, unit, increment) {
  const step = increment != null && increment > 0
    ? increment
    : (unit === 'lb' ? 1 : 0.5);
  return Math.round(val / step) * step;
}

// Aggregate volume (e.g. "total weight lifted") is always shown as a clean
// integer — never "15,751.3 kg" — because a decimal on a number this large is
// noise, not signal.
export function formatVolume(kg, unit) {
  if (kg == null || Number.isNaN(kg)) return '—';
  const val = unit === 'lb' ? kgToLb(kg) : kg;
  return `${Math.round(val).toLocaleString()}${unit}`;
}

export function formatWeight(kg, unit, increment) {
  const val = displayWeight(kg, unit);
  if (val == null) return '—';
  const snapped = snapToIncrement(val, unit, increment);
  // Two decimals covers 0.25/0.5 plate steps without ever printing junk like "20.8".
  const trimmed = Number.isInteger(snapped) ? snapped : Math.round(snapped * 100) / 100;
  return `${trimmed.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}`;
}
