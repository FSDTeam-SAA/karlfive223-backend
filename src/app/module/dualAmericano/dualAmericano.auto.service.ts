import { Types } from 'mongoose';
import DualAmericano from './dualAmericano.model';
import { DualAmericanoStatus } from './dualAmericano.interface';
import { formPairsFromPlayers } from './dualAmericano.helpers';
import {
  generateDualAmericanoRound,
  canPlayMoreRounds,
} from './dualAmericano.pairing';

export const autoStartDualAmericanoEvents = async () => {
  const now = new Date();

  const upcomingEvents = await DualAmericano.find({
    isDeleted: false,
    status: DualAmericanoStatus.UPCOMING,
    startDate: { $lte: now },
  });

  for (const dual of upcomingEvents) {
    try {
      console.log(`Auto starting Dual Americano ${dual._id}`);

      /**
       * Auto create pairs from players
       */
      if (!dual.registeredPairs?.length) {
        formPairsFromPlayers(dual);
      }

      if (dual.pairCount < 2) {
        console.log(
          `Skipping ${dual._id}: not enough pairs`
        );
        continue;
      }

      /**
       * reset in case rerun happens
       */
      dual.rounds = [];
      dual.usedMatchups = [];
      dual.currentRound = 0;

      let previousByes: Types.ObjectId[] = [];

      /**
       * generate ALL rounds
       */
      for (let i = 0; i < dual.numberOfRounds; i++) {
        const canContinue = canPlayMoreRounds(
          dual.pairCount,
          dual.usedMatchups.length,
          dual.numberOfCourts,
        );

        if (!canContinue) {
          console.log(
            `Stopping round generation early for ${dual._id} — all matchups exhausted`
          );
          break;
        }

        const registeredPairIds = dual.registeredPairs.map(
          (p) => p._id as Types.ObjectId,
        );

        const result = generateDualAmericanoRound(
          registeredPairIds,
          dual.usedMatchups,
          previousByes,
          dual.numberOfCourts,
        );

        const matches = result.matches.map((m) => ({
          court: m.court,
          pair1: new Types.ObjectId(m.pair1),
          pair2: new Types.ObjectId(m.pair2),
          status: 'pending',
          score: null,
          winner: null,
        }));

        dual.rounds.push({
          roundNumber: i + 1,
          matches,
          status: 'pending',
          byePairs: result.byePairs.map(
            (id) => new Types.ObjectId(id),
          ),
        } as any);

        /**
         * store used matchups
         */
        for (const key of result.newMatchupKeys) {
          if (!dual.usedMatchups.includes(key)) {
            dual.usedMatchups.push(key);
          }
        }

        previousByes = result.byePairs.map(
          (id) => new Types.ObjectId(id),
        );
      }

      dual.currentRound = 1;
      dual.status = DualAmericanoStatus.ACTIVE;
      dual.startedAt = now;

      await dual.save();

      console.log(
        `Dual Americano started with ${dual.rounds.length} rounds`
      );
    } catch (error) {
      console.error(
        `Auto-start failed for Dual ${dual._id}`,
        error,
      );
    }
  }
};