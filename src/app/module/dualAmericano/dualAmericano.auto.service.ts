// import { DualAmericano } from './dualAmericano.model';
// import { DualAmericanoStatus } from './dualAmericano.constant';
import { formPairsFromPlayers } from './dualAmericano.helpers';
import { generateDualAmericanoRound } from './dualAmericano.pairing';
import { Types } from 'mongoose';
import { DualAmericanoStatus } from './dualAmericano.interface';
import DualAmericano from './dualAmericano.model';

export const autoStartDualAmericanoEvents = async () => {
  const now = new Date();

  const upcomingEvents = await DualAmericano.find({
    isDeleted: false,
    status: DualAmericanoStatus.UPCOMING,
    startDate: { $lte: now },
  });

  for (const dual of upcomingEvents) {
    try {
      console.log(`Starting Dual Americano: ${dual._id}`);

      /**
       * create pairs if not exists
       */
      if (!dual.registeredPairs?.length) {
        formPairsFromPlayers(dual);
      }

      if (dual.pairCount < 2) {
        console.log(
          `Skipping ${dual._id} because minimum pair count not reached`,
        );
        continue;
      }

      /**
       * create first round
       */
      const registeredPairIds = dual.registeredPairs.map(
        (p) => p._id as Types.ObjectId,
      );

      const result = generateDualAmericanoRound(
        registeredPairIds,
        dual.usedMatchups || [],
        [],
        dual.numberOfCourts,
      );

      const matches = result.matches.map((match) => ({
        court: match.court,
        pair1: new Types.ObjectId(match.pair1),
        pair2: new Types.ObjectId(match.pair2),
        status: 'pending',
        score: null,
        winner: null,
      }));

      dual.rounds.push({
        roundNumber: 1,
        matches,
        status: 'pending',
        byePairs: result.byePairs.map(
          (id) => new Types.ObjectId(id),
        ),
      } as any);

      dual.currentRound = 1;
      dual.usedMatchups = result.newMatchupKeys;

      dual.status = DualAmericanoStatus.ACTIVE;
      dual.startedAt = now;

      await dual.save();

      console.log(`Dual Americano started successfully: ${dual._id}`);
    } catch (error) {
      console.error(
        `Auto start failed for dual ${dual._id}`,
        error,
      );
    }
  }
};