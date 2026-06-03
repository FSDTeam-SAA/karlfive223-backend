import { Types } from 'mongoose';
import { IDualAmericano, IDualAmericanoPair } from './dualAmericano.interface';
import User from '../user/user.model';

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
export const formPairsFromPlayers = async (dual: IDualAmericano): Promise<IDualAmericanoPair[]> => {
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

  // Fetch all player names to auto-generate pair names
  const users = await User.find(
    { _id: { $in: players.map(id => new Types.ObjectId(id)) } },
    { _id: 1, name: 1 }
  ).lean();

  const userMap = new Map<string, string>();
  for (const u of users) {
    userMap.set(u._id.toString(), u.name || '');
  }

  const getFirstName = (name: string): string => {
    if (!name) return 'Player';
    const parts = name.trim().split(/\s+/);
    const first = parts[0] || 'Player';
    return first.charAt(0).toUpperCase() + first.slice(1);
  };

  const getPairName = (p1Id: string, p2Id: string): string => {
    const p1Name = getFirstName(userMap.get(p1Id) || '');
    const p2Name = getFirstName(userMap.get(p2Id) || '');
    return `${p1Name} & ${p2Name}`;
  };

  // All C(N,2) partner combinations
  const allPairs: IDualAmericanoPair[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1Id = players[i];
      const p2Id = players[j];
      const pairName = getPairName(p1Id, p2Id);
      allPairs.push({
        _id: new Types.ObjectId(),
        player1: new Types.ObjectId(p1Id),
        player2: new Types.ObjectId(p2Id),
        pairName,
        joinedAt: new Date(),
      } as IDualAmericanoPair);
    }
  }

  dual.registeredPairs = allPairs as any;
  // pairCount = individual player count (consumed by canPlayMoreRounds)
  dual.pairCount = players.length;

  dual.pairStandings = players.map(pid => {
    const uName = userMap.get(pid) || '';
    const playerName = getFirstName(uName);
    return {
      player: new Types.ObjectId(pid),
      playerName,
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
    };
  }) as any;

  return allPairs;
};

