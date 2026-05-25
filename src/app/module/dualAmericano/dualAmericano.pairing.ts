import { Types } from 'mongoose';

export type PairId = string;

export interface DualAmericanoPairingMatch {
  court: number;
  pair1: PairId;
  pair2: PairId;
}

export interface DualAmericanoPairingResult {
  matches: DualAmericanoPairingMatch[];
  byePairs: PairId[];
  newMatchupKeys: string[];
}

// Canonical key for two players as partners (sorted by player ID string)
export function partnerKey(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

// Alias kept for any code that imports matchupKey
export const matchupKey = partnerKey;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate one Dual Americano round.
 *
 * registeredPairs must contain ALL C(N,2) possible partner combinations for N
 * players (built by formPairsFromPlayers in helpers.ts).  The algorithm:
 *   1. Extracts unique individual player IDs from the pair objects.
 *   2. Greedily selects floor(N/2) non-overlapping partner pairs, preferring
 *      combinations not yet used.
 *   3. Matches adjacent selected pairs against each other on courts.
 *
 * usedMatchups stores canonical partnerKey strings, NOT opponent-pair keys.
 */
export function generateDualAmericanoRound(
  registeredPairs: { _id: Types.ObjectId | any; player1: Types.ObjectId | any; player2: Types.ObjectId | any }[],
  usedMatchups: string[],
  _previousByes: Types.ObjectId[],
  numberOfCourts: number,
): DualAmericanoPairingResult {
  const usedSet = new Set(usedMatchups);

  // Build lookup: partnerKey(player1, player2) → pair._id string
  const pairLookup = new Map<string, string>();
  for (const p of registeredPairs) {
    const key = partnerKey(p.player1.toString(), p.player2.toString());
    pairLookup.set(key, p._id.toString());
  }

  // Unique individual players
  const playerSet = new Set<string>();
  for (const p of registeredPairs) {
    playerSet.add(p.player1.toString());
    playerSet.add(p.player2.toString());
  }
  const players = shuffle(Array.from(playerSet));

  const assignedPlayers = new Set<string>();
  const selectedPairIds: string[] = [];
  const newKeys: string[] = [];

  for (let i = 0; i < players.length; i++) {
    const p1 = players[i];
    if (assignedPlayers.has(p1)) continue;

    let bestPartner: string | null = null;
    let fallbackPartner: string | null = null; // all combos exhausted — reuse

    for (let j = 0; j < players.length; j++) {
      const p2 = players[j];
      if (p2 === p1 || assignedPlayers.has(p2)) continue;
      const key = partnerKey(p1, p2);
      if (!pairLookup.has(key)) continue; // no registered pair for this combo
      if (!usedSet.has(key)) {
        bestPartner = p2;
        break;
      }
      if (fallbackPartner === null) fallbackPartner = p2;
    }

    const partner = bestPartner ?? fallbackPartner;
    if (!partner) continue; // this player sits out (odd count)

    const key = partnerKey(p1, partner);
    selectedPairIds.push(pairLookup.get(key)!);
    assignedPlayers.add(p1);
    assignedPlayers.add(partner);
    usedSet.add(key);
    newKeys.push(key);
  }

  // Players without a partner this round → bye
  const byePlayerIds = players.filter(p => !assignedPlayers.has(p));
  const byePairIds = byePlayerIds.map(pid => {
    for (const [key, id] of pairLookup) {
      const [a, b] = key.split('_');
      if (a === pid || b === pid) return id;
    }
    return pid;
  });

  // Adjacent selected pairs play against each other on courts
  const matches: DualAmericanoPairingMatch[] = [];
  let court = 1;
  for (let i = 0; i + 1 < selectedPairIds.length && court <= numberOfCourts; i += 2) {
    matches.push({ court: court++, pair1: selectedPairIds[i], pair2: selectedPairIds[i + 1] });
  }

  return { matches, byePairs: byePairIds, newMatchupKeys: newKeys };
}

/**
 * True if at least one more full round can be generated.
 * playerCount = number of individual players (dual.pairCount after formPairsFromPlayers).
 * A round needs floor(N/2) unused partner pairs.
 */
export function canPlayMoreRounds(
  playerCount: number,
  usedPartnerPairsCount: number,
  _courtsPerRound: number,
): boolean {
  if (playerCount < 2) return false;
  const totalPossiblePartnerPairs = (playerCount * (playerCount - 1)) / 2;
  const pairsPerRound = Math.floor(playerCount / 2);
  return totalPossiblePartnerPairs - usedPartnerPairsCount >= pairsPerRound;
}

// Maximum complete rounds for N players (each player partners everyone exactly once)
export function maxPossibleRounds(playerCount: number, _courts: number): number {
  if (playerCount < 2) return 0;
  const totalPossiblePartnerPairs = (playerCount * (playerCount - 1)) / 2;
  const pairsPerRound = Math.floor(playerCount / 2);
  return Math.floor(totalPossiblePartnerPairs / pairsPerRound);
}

export function recommendedRounds(playerCount: number, courts: number): number {
  return maxPossibleRounds(playerCount, courts);
}
