import { Types } from 'mongoose';
import { IDualAmericano, IDualAmericanoPair } from './dualAmericano.interface';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export const formPairsFromPlayers = (dual: IDualAmericano) => {
  if (!dual.registeredPlayers || dual.registeredPlayers.length < 2) {
    throw new Error('Not enough players to create pairs');
  }

  if (dual.registeredPairs?.length) return dual.registeredPairs;

  const shuffledPlayers = shuffle(
    dual.registeredPlayers.map((p) => p.toString()),
  );

  const pairs: IDualAmericanoPair[] = [];

  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    if (!shuffledPlayers[i + 1]) break;

    pairs.push({
      _id: new Types.ObjectId(),
      player1: new Types.ObjectId(shuffledPlayers[i]),
      player2: new Types.ObjectId(shuffledPlayers[i + 1]),
      pairName: null,
      joinedAt: new Date(),
    } as IDualAmericanoPair);
  }

  dual.registeredPairs = pairs;
  dual.pairCount = pairs.length;

  dual.pairStandings = pairs.map((pair) => ({
    pair: pair._id,
    pairName: pair.pairName ?? null,
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

  return pairs;
};