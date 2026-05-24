/**
 * COPILOT TASK: Generate the Dual Americano module.
 */

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

export function matchupKey(a: PairId, b: PairId): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectBye(pairs: PairId[], previousByes: PairId[]): { active: PairId[]; bye: PairId[] } {
  if (pairs.length % 2 === 0) return { active: pairs, bye: [] };
  const hadBye = new Set(previousByes);
  const candidate = pairs.find(p => !hadBye.has(p)) ?? pairs[pairs.length - 1];
  return { active: pairs.filter(p => p !== candidate), bye: [candidate] };
}

function buildUniquePairings(pairs: PairId[], usedMatchups: Set<string>): [PairId, PairId][] {
  const remaining = shuffle(pairs);
  const res: [PairId, PairId][] = [];
  while (remaining.length >= 2) {
    const pivot = remaining[0];
    let bestIdx = -1;
    for (let i = 1; i < remaining.length; i++) {
      if (!usedMatchups.has(matchupKey(pivot, remaining[i]))) { bestIdx = i; break; }
    }
    const chosenIdx = bestIdx !== -1 ? bestIdx : 1;
    const partner = remaining.splice(chosenIdx, 1)[0];
    remaining.shift();
    const key = matchupKey(pivot, partner);
    usedMatchups.add(key);
    res.push([pivot, partner]);
  }
  return res;
}

function arrangeCourts(pairs: [PairId, PairId][], maxCourts: number): DualAmericanoPairingMatch[] {
  const matches: DualAmericanoPairingMatch[] = [];
  let court = 1;
  for (let i = 0; i + 1 < pairs.length && court <= maxCourts; i += 2) {
    matches.push({ court: court++, pair1: pairs[i][0], pair2: pairs[i + 1][0] });
  }
  return matches;
}

export function generateDualAmericanoRound(
  registeredPairs: Types.ObjectId[],
  usedMatchupsFromDB: string[],
  previousByes: Types.ObjectId[],
  numberOfCourts: number,
): DualAmericanoPairingResult {
  const pairIds = registeredPairs.map(p => p.toString());
  const prevByes = previousByes.map(p => p.toString());
  const usedSet = new Set<string>(usedMatchupsFromDB);
  const { active, bye } = selectBye(pairIds, prevByes);
  const maxActive = numberOfCourts * 2; // two pairs per court
  const activePairs = active.slice(0, maxActive);
  const extraByes = active.slice(maxActive);
  const pairings = buildUniquePairings(activePairs, usedSet);
  const matches = arrangeCourts(pairings, numberOfCourts);
  const newMatchupKeys: string[] = pairings.flatMap(p => [matchupKey(p[0], p[1])]);
  return { matches, byePairs: [...bye, ...extraByes], newMatchupKeys };
}

export function canPlayMoreRounds(pairCount: number, usedMatchupsCount: number, courtsPerRound: number): boolean {
  const totalPossibleMatchups = (pairCount * (pairCount - 1)) / 2;
  return totalPossibleMatchups - usedMatchupsCount >= courtsPerRound;
}

export function maxPossibleRounds(pairCount: number, courts: number): number {
  return Math.floor(((pairCount * (pairCount - 1)) / 2) / courts);
}

export function recommendedRounds(pairCount: number, courts: number): number {
  return Math.min(maxPossibleRounds(pairCount, courts), Math.ceil((pairCount - 1) / 2));
}
