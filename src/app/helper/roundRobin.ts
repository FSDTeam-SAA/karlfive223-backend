/**
 * Generates round-by-round fixtures using the circle method.
 *
 * With 4 teams A/B/C/D and legs=1 (6 games):
 *   Round 1: A-B, C-D
 *   Round 2: A-C, D-B
 *   Round 3: A-D, B-C
 *
 * For legs > 1 the same round schedule repeats (no home/away reversal),
 * so each pair simply plays legs times in the same direction.
 * Odd team counts get a virtual BYE; matches involving BYE are skipped.
 */
export const generateRoundRobin = (ids: any[], legs = 1): { slotA: any; slotB: any }[] => {
  const n = ids.length;
  if (n < 2) return [];

  // Pad to even count with a null BYE when odd
  const teams = n % 2 === 0 ? [...ids] : [...ids, null];
  const size = teams.length; // always even

  const fixed = teams[0];
  const originalRotating = teams.slice(1); // size-1 elements

  const result: { slotA: any; slotB: any }[] = [];

  for (let leg = 1; leg <= legs; leg++) {
    let rotating = [...originalRotating];

    for (let r = 0; r < size - 1; r++) {
      // Arrangement: [fixed, rotating[0], rotating[1], ...]
      const arrangement = [fixed, ...rotating];

      // Pair adjacent positions: (0,1), (2,3), ...
      for (let i = 0; i < size; i += 2) {
        const slotA = arrangement[i];
        const slotB = arrangement[i + 1];
        if (slotA !== null && slotB !== null) {
          result.push({ slotA, slotB });
        }
      }

      // Left-rotate the rotating list: [r0, r1, r2] → [r1, r2, r0]
      rotating = [...rotating.slice(1), rotating[0]];
    }
  }

  return result;
};
