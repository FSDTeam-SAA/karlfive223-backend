import { Types } from 'mongoose';
import { formPairsFromPlayers } from './dualAmericano.helpers';
import { DualAmericanoStatus } from './dualAmericano.interface';
import DualAmericano from './dualAmericano.model';
import {
  canPlayMoreRounds,
  generateDualAmericanoRound,
  maxPossibleRounds,
} from './dualAmericano.pairing';

export const autoStartDualAmericanoEvents = async () => {
  const now = new Date();

  const upcomingEvents = await DualAmericano.find({
    isDeleted: false,
    status: DualAmericanoStatus.UPCOMING,
    scheduledAt: { $lte: now },
  });

  for (const dual of upcomingEvents) {
    try {
      console.log(`Auto starting Dual Americano ${dual._id}`);

      // Reset state so a re-triggered cron always starts clean
      dual.rounds = [];
      dual.usedMatchups = [];
      dual.currentRound = 0;
      dual.pairStandings = [];

      // Build all C(N,2) partner-pair combinations from individual players.
      // Works whether players registered individually (registeredPlayers) or as
      // fixed pairs (registeredPairs) — formPairsFromPlayers merges both sources.
      try {
        formPairsFromPlayers(dual as any);
      } catch (e: any) {
        console.log(`Skipping ${dual._id}: ${e.message}`);
        continue;
      }

      // Need at least 4 individual players (= 2 pairs on 1 court)
      if (dual.pairCount < 4) {
        console.log(`Skipping ${dual._id}: need at least 4 players, found ${dual.pairCount}`);
        continue;
      }

      // Derive the number of rounds from actual player count
      dual.numberOfRounds = maxPossibleRounds(dual.pairCount, dual.numberOfCourts);
      console.log(
        `${dual.pairCount} players → ${dual.registeredPairs.length} partner combos → ${dual.numberOfRounds} rounds`,
      );

      // Pre-generate ALL rounds upfront
      let generatedRounds = 0;
      while (canPlayMoreRounds(dual.pairCount, dual.usedMatchups.length, dual.numberOfCourts)) {
        const result = generateDualAmericanoRound(
          dual.registeredPairs as any,
          dual.usedMatchups,
          [],
          dual.numberOfCourts,
        );

        if (result.matches.length === 0) {
          console.log(`Round ${generatedRounds + 1}: no matches could be formed, stopping early`);
          break;
        }

        const matches = result.matches.map(m => ({
          court: m.court,
          pair1: new Types.ObjectId(m.pair1),
          pair2: new Types.ObjectId(m.pair2),
          status: 'pending',
          score: null,
          winner: null,
        }));

        dual.rounds.push({
          roundNumber: generatedRounds + 1,
          matches,
          status: 'pending',
          byePairs: result.byePairs.map(id => new Types.ObjectId(id)),
        } as any);

        for (const key of result.newMatchupKeys) {
          if (!dual.usedMatchups.includes(key)) {
            dual.usedMatchups.push(key);
          }
        }

        generatedRounds++;
      }

      if (generatedRounds === 0) {
        console.log(`Skipping ${dual._id}: could not generate any rounds`);
        continue;
      }

      dual.currentRound = 1;
      dual.status = DualAmericanoStatus.ACTIVE;
      dual.startedAt = now;

      await dual.save();
      console.log(`✅ Dual Americano ${dual._id} started with ${dual.rounds.length} rounds`);
    } catch (error) {
      console.error(`Auto-start failed for Dual ${dual._id}`, error);
    }
  }
};
