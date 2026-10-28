/**
 * Round generation for the free one-day Americano.
 *
 * Same idea as the Dual Americano rotation (dualAmericano.pairing.ts): every
 * round the players are split into partner pairs, and pairs play pairs. A
 * partner combination is used at most once, so over the event everyone
 * partners as many different players as possible. Ranking stays per player.
 *
 * Unlike the Dual version, only players who actually get a match are paired
 * (so no partner combination is "spent" on a pair that sits out), and the
 * players who sit out a round are always the ones who have played the most.
 */

export interface FreeAmericanoPairingMatch {
  teamOne: [string, string];
  teamTwo: [string, string];
}

export interface FreeAmericanoPairingRound {
  roundNumber: number;
  matches: FreeAmericanoPairingMatch[];
  /** Players sitting this round out. */
  byes: string[];
}

const partnerKey = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);

const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Attempts per round before deciding no further round is possible.
const ROUND_ATTEMPTS = 200;
// Search budget for pairing the players of a single attempt.
const MATCHING_STEP_LIMIT = 2000;

/**
 * Splits `players` into partner pairs that have not partnered before.
 * Returns null when no such split is found within the search budget.
 */
const findPartnerPairs = (
  players: string[],
  usedPartners: Set<string>
): [string, string][] | null => {
  let steps = 0;
  const pairs: [string, string][] = [];
  const assigned = new Set<string>();

  const options = (p: string) =>
    players.filter(
      (q) => q !== p && !assigned.has(q) && !usedPartners.has(partnerKey(p, q))
    );

  const solve = (): boolean => {
    if (++steps > MATCHING_STEP_LIMIT) return false;

    // Pair the most constrained player first.
    let next: string | null = null;
    let nextOptions: string[] = [];
    for (const p of players) {
      if (assigned.has(p)) continue;
      const opts = options(p);
      if (next === null || opts.length < nextOptions.length) {
        next = p;
        nextOptions = opts;
        if (opts.length === 0) break;
      }
    }
    if (next === null) return true;

    for (const partner of shuffle(nextOptions)) {
      assigned.add(next);
      assigned.add(partner);
      pairs.push([next, partner]);
      if (solve()) return true;
      pairs.pop();
      assigned.delete(next);
      assigned.delete(partner);
    }
    return false;
  };

  return solve() ? pairs : null;
};

/**
 * Puts the pairs against each other, preferring opponents players have
 * faced least so far.
 */
const pairUpPairs = (
  pairs: [string, string][],
  opponentCount: Map<string, number>
): FreeAmericanoPairingMatch[] => {
  const cost = (a: [string, string], b: [string, string]) => {
    let total = 0;
    for (const x of a) {
      for (const y of b) total += opponentCount.get(partnerKey(x, y)) ?? 0;
    }
    return total;
  };

  let best: FreeAmericanoPairingMatch[] = [];
  let bestCost = Infinity;
  for (let attempt = 0; attempt < 30 && bestCost > 0; attempt++) {
    const order = shuffle(pairs);
    let total = 0;
    const matches: FreeAmericanoPairingMatch[] = [];
    for (let i = 0; i + 1 < order.length; i += 2) {
      total += cost(order[i], order[i + 1]);
      matches.push({ teamOne: order[i], teamTwo: order[i + 1] });
    }
    if (total < bestCost) {
      best = matches;
      bestCost = total;
    }
  }
  return best;
};

// Whole schedules tried per event; the best one is kept.
const SCHEDULE_ATTEMPTS = 40;
// Stop trying once this much time is spent (a single schedule takes ms).
const SCHEDULE_TIME_BUDGET_MS = 1500;

/**
 * Generates every round for the event up front. Rounds are added until no
 * new round can be formed without repeating a partner combination.
 *
 * Pairing is randomised, and an unlucky early round can leave no valid
 * round later on (e.g. 5 players ending after 3 of 5 possible rounds), so
 * several schedules are built and the best one is kept: most games for the
 * player who plays least, then the most even spread, then most matches.
 */
export const generateFreeAmericanoRounds = (
  playerIds: string[]
): FreeAmericanoPairingRound[] => {
  const players = playerIds.map(String);
  const perRound = Math.floor(players.length / 4) * 4;
  if (perRound < 4) return [];

  // Each round uses perRound / 2 partner combinations.
  const allPartners = (players.length * (players.length - 1)) / 2;
  const maxRounds = Math.floor(allPartners / (perRound / 2));

  const score = (rounds: FreeAmericanoPairingRound[]) => {
    const games = new Map<string, number>(players.map((p) => [p, 0]));
    for (const round of rounds) {
      for (const { teamOne, teamTwo } of round.matches) {
        for (const p of [...teamOne, ...teamTwo]) games.set(p, games.get(p)! + 1);
      }
    }
    const counts = [...games.values()];
    const min = Math.min(...counts);
    return [min, -(Math.max(...counts) - min), rounds.length];
  };
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] > b[i];
    }
    return false;
  };

  const started = Date.now();
  let best: FreeAmericanoPairingRound[] = [];
  let bestScore: number[] | null = null;
  for (let attempt = 0; attempt < SCHEDULE_ATTEMPTS; attempt++) {
    const rounds = buildSchedule(players, perRound);
    const s = score(rounds);
    if (!bestScore || better(s, bestScore)) {
      best = rounds;
      bestScore = s;
    }
    // A full rotation can't be beaten.
    if (best.length >= maxRounds && bestScore[1] >= -1) break;
    if (Date.now() - started > SCHEDULE_TIME_BUDGET_MS) break;
  }
  return best;
};

const buildSchedule = (
  players: string[],
  perRound: number
): FreeAmericanoPairingRound[] => {
  const usedPartners = new Set<string>();
  const opponentCount = new Map<string, number>();
  const played = new Map<string, number>(players.map((p) => [p, 0]));
  const rounds: FreeAmericanoPairingRound[] = [];

  for (let roundNumber = 1; ; roundNumber++) {
    let pairs: [string, string][] | null = null;
    let playing: string[] = [];

    for (let attempt = 0; attempt < ROUND_ATTEMPTS && !pairs; attempt++) {
      // Fewest games played go first; ties broken randomly. On later
      // attempts allow a little slack so a stuck round can still be formed.
      const slack = attempt < ROUND_ATTEMPTS / 2 ? 0 : 1;
      playing = shuffle(players)
        .map((p) => ({ p, key: played.get(p)! + Math.random() * slack }))
        .sort((a, b) => a.key - b.key)
        .slice(0, perRound)
        .map(({ p }) => p);
      pairs = findPartnerPairs(playing, usedPartners);
    }

    if (!pairs) break;

    for (const [a, b] of pairs) usedPartners.add(partnerKey(a, b));
    for (const p of playing) played.set(p, played.get(p)! + 1);

    const matches = pairUpPairs(pairs, opponentCount);
    for (const { teamOne, teamTwo } of matches) {
      for (const x of teamOne) {
        for (const y of teamTwo) {
          const key = partnerKey(x, y);
          opponentCount.set(key, (opponentCount.get(key) ?? 0) + 1);
        }
      }
    }

    const playingSet = new Set(playing);
    rounds.push({
      roundNumber,
      matches,
      byes: players.filter((p) => !playingSet.has(p)),
    });
  }

  return rounds;
};
