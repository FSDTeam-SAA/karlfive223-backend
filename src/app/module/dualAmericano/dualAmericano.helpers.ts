import { Types } from 'mongoose';
import { IDualAmericano, IDualAmericanoPair } from './dualAmericano.interface';

/**
 * Builds ALL C(N,2) possible partner-pair combinations from every individual
 * player found in registeredPlayers OR already in registeredPairs.
 *
 * After this call:
 *   dual.registeredPairs  → C(N,2) pair documents (one per unique partner combo)
 *   dual.pairCount        → N  (number of individual players, used by canPlayMoreRounds)
 *   dual.pairStandings    → one standing row per partner-pair combination
 *
 * Called at auto-start AND manual start to set up the Dual Americano rotation.
 * Replaces any previously stored registeredPairs so the rotation is always clean.
 */
export const formPairsFromPlayers = (dual: IDualAmericano): IDualAmericanoPair[] => {
  // Collect individual player IDs from both sources
  const playerSet = new Set<string>();
  for (const p of dual.registeredPlayers ?? []) {
    playerSet.add(p.toString());
  }
  for (const pair of dual.registeredPairs ?? []) {
    playerSet.add(pair.player1.toString());
    playerSet.add(pair.player2.toString());
  }

  const players = Array.from(playerSet);
  if (players.length < 2) throw new Error('Not enough players to create pairs');

  // All C(N,2) partner combinations
  const allPairs: IDualAmericanoPair[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      allPairs.push({
        _id: new Types.ObjectId(),
        player1: new Types.ObjectId(players[i]),
        player2: new Types.ObjectId(players[j]),
        pairName: null,
        joinedAt: new Date(),
      } as IDualAmericanoPair);
    }
  }

  dual.registeredPairs = allPairs as any;
  // pairCount = individual player count (consumed by canPlayMoreRounds)
  dual.pairCount = players.length;

  dual.pairStandings = allPairs.map(pair => ({
    pair: pair._id,
    pairName: null,
    player1: pair.player1,
    player2: pair.player2,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    matchesDrawn: 0,
    totalPoints: 0,
    totalPointsAgainst: 0,
    pointsDifference: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    rankScore: 0,
  })) as any;

  return allPairs;
};
