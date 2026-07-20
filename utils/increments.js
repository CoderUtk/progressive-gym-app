// Most commercial gyms don't have 0.5kg dumbbell micro-plates, so a flat
// +1kg step isn't always loadable. This maps each equipment type to a
// realistic minimum jump, using the gym's configured plate increment where
// it applies (barbells, machines, cables) and a fixed pair-jump for
// dumbbells (which usually come in fixed 2/2.5kg pair increments).
export function stepForEquipment(equipment, plateIncrement = 2.5) {
  switch (equipment) {
    case 'Barbell':
      return Math.max(2.5, plateIncrement);
    case 'Dumbbell':
      return 2.5;
    case 'Machine':
    case 'Cable':
      return plateIncrement;
    case 'Bodyweight':
      return 1;
    default:
      return plateIncrement;
  }
}
