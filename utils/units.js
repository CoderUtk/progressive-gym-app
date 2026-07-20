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

export function formatWeight(kg, unit) {
  const val = displayWeight(kg, unit);
  if (val == null) return '—';
  const trimmed = Number.isInteger(val) ? val : Math.round(val * 10) / 10;
  return `${trimmed}${unit}`;
}
