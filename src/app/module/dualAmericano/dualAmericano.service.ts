/**
 * COPILOT TASK: Generate the Dual Americano module.
 */

import { Types } from 'mongoose';
// @ts-ignore
import httpStatus from 'http-status';
import AppError from '../../error/appError';
import {
    DualAmericanoMatchStatus, DualAmericanoRoundStatus,
    DualAmericanoStatus,
    IDualAmericano,
    IDualAmericanoMatch,
    ISubmitMatchScore,
} from './dualAmericano.interface';
import DualAmericano from './dualAmericano.model';
import { DualAmericanoChat } from './dualAmericanoChat.model';
import User from '../user/user.model';
import { formPairsFromPlayers } from './dualAmericano.helpers';
import { canPlayMoreRounds, generateDualAmericanoRound, maxPossibleRounds, recommendedRounds } from './dualAmericano.pairing';
import { createAndSendNotifications } from '../../helper/socketHelper';
import { sendPushNotification } from '../../utils/sendPushNotification';

// Create event
export const createDualAmericano = async (payload: any, createdBy: string) => {
  // Estimate player count from maxPairs so recommendedRounds uses the right formula
  const estimatedPlayers = payload.maxPairs * 2;
  const defaultRounds = recommendedRounds(estimatedPlayers, payload.numberOfCourts);
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  return DualAmericano.create({
    ...payload,
    createdBy: new Types.ObjectId(createdBy),
    // club: new Types.ObjectId(payload.club),
    // league: payload.league ? new Types.ObjectId(payload.league) : null,
    numberOfRounds: payload.numberOfRounds ?? defaultRounds,
    pointsPerSet: payload.pointsPerSet ?? 21,
    setsPerMatch: payload.setsPerMatch ?? 1,
    status: 'upcoming',
    pairCount: 0,
    registeredPairs: [],
    registeredPlayers: [],
    rounds: [],
    pairStandings: [],
    usedMatchups: [],
    currentRound: 0,
    joinCode,
  });
};

// Player joins by code (single-player registration)
export const joinByCode = async (dualId: string, userId: string, code: string) => {
  const dual = await DualAmericano.findOne({ joinCode: code, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.status !== DualAmericanoStatus.UPCOMING) throw new AppError(httpStatus.BAD_REQUEST, 'Registration closed');
  if (!dual.joinCode || dual.joinCode !== code) throw new AppError(httpStatus.FORBIDDEN, 'Invalid join code');
  const maxPlayers = dual.maxPairs * 2;
  if ((dual.registeredPlayers?.length ?? 0) >= maxPlayers) throw new AppError(httpStatus.BAD_REQUEST, 'Event is full');
  if (dual.registeredPlayers?.some(p => p.toString() === userId)) throw new AppError(httpStatus.CONFLICT, 'Player already registered');
  dual.registeredPlayers = dual.registeredPlayers ?? [];
  dual.registeredPlayers.push(new Types.ObjectId(userId));
  await dual.save();
  return dual;
};

// List events with optional filters
export const getAll = async (filters: any = {}, page = 1, limit = 20) => {
  const query: any = { isDeleted: false };
  if (filters.status) query.status = filters.status;
  if (filters.club) query.club = filters.club;
  if (filters.league) query.league = filters.league;
  const skip = (page - 1) * limit;
  const items = await DualAmericano.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
  const total = await DualAmericano.countDocuments(query);
  return { items, total, page, limit };
};

export const getById = async (id: string) => {
  return DualAmericano.findById(id);
};

export const getAllMatchesByEvent = async (dualId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');

  const pairMap = new Map(
    dual.registeredPairs.map((pair) => [pair._id!.toString(), pair]),
  );

  return dual.rounds.map((round) => ({
    roundNumber: round.roundNumber,
    status: round.status,
    matches: round.matches.map((match) => {
      const pair1 = pairMap.get(match.pair1.toString());
      const pair2 = pairMap.get(match.pair2.toString());

      return {
        _id: match._id,
        court: match.court,
        status: match.status,
        score: match.score,
        winner: match.winner,
        matchDateTime: match.matchDateTime,
        startTime: match.startTime,
        endTime: match.endTime,
        pair1,
        pair2,
      };
    }),
  }));
};

export const getPlayersByEvent = async (dualId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');

  const playerIds = Array.from(
    new Set([
      ...(dual.registeredPlayers ?? []).map((id) => id.toString()),
      ...dual.registeredPairs.flatMap((pair) => [
        pair.player1.toString(),
        pair.player2.toString(),
      ]),
    ]),
  );

  const players = await User.find(
    { _id: { $in: playerIds.map((id) => new Types.ObjectId(id)) } },
    { _id: 1, name: 1, email: 1, profileImage: 1 },
  ).lean();

  return {
    totalPlayers: players.length,
    players,
  };
};

export const getByClub = async (clubId: string) => {
  return DualAmericano.find({ club: clubId, isDeleted: false }).sort({ createdAt: -1 });
};

// Events where the caller is creator or registered player
export const getMyEvents = async (userId: string, filters: { status?: string; league?: string } = {}, page = 1, limit = 20) => {
  const uid = new Types.ObjectId(userId);
  const query: any = {
    isDeleted: false,
    $or: [
      { createdBy: uid },
      { registeredPlayers: uid },
      { 'registeredPairs.player1': uid },
      { 'registeredPairs.player2': uid },
    ],
  };
  if (filters.status) query.status = filters.status;
  if (filters.league) query.league = new Types.ObjectId(filters.league);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    DualAmericano.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
    DualAmericano.countDocuments(query),
  ]);
  return { items, total, page, limit };
};

export const updateDualAmericano = async (id: string, payload: any, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: id, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.createdBy.toString() !== requesterId) throw new AppError(httpStatus.FORBIDDEN, 'Only organizer can update');
  if (dual.status !== DualAmericanoStatus.UPCOMING) throw new AppError(httpStatus.BAD_REQUEST, 'Cannot update after start');
  Object.assign(dual, payload);
  await dual.save();
  return dual;
};

export const removeDualAmericano = async (id: string, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: id, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.createdBy.toString() !== requesterId) throw new AppError(httpStatus.FORBIDDEN, 'Only organizer can remove');
  dual.isDeleted = true;
  await dual.save();
  return dual;
};

export const cancelDualAmericano = async (id: string, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: id, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.createdBy.toString() !== requesterId) throw new AppError(httpStatus.FORBIDDEN, 'Only organizer can cancel');
  dual.status = DualAmericanoStatus.CANCELLED;
  await dual.save();
  return dual;
};

// Register a pair (self-register or organizer)
export const registerPair = async (dualId: string, payload: { player1Id: string; player2Id: string; pairName?: string }, requesterId: string, isOrganizer = false) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.status !== 'upcoming') throw new AppError(httpStatus.BAD_REQUEST, 'Registration closed');
  if (dual.pairCount >= dual.maxPairs) throw new AppError(httpStatus.BAD_REQUEST, 'Event is full');
  // ensure players are not already in any pair
  const already = dual.registeredPairs.find(p => p.player1.toString() === payload.player1Id || p.player2.toString() === payload.player1Id || p.player1.toString() === payload.player2Id || p.player2.toString() === payload.player2Id);
  if (already) throw new AppError(httpStatus.CONFLICT, 'One of the players is already in a pair');

  let pairName = payload.pairName;
  if (!pairName) {
    const users = await User.find(
      { _id: { $in: [new Types.ObjectId(payload.player1Id), new Types.ObjectId(payload.player2Id)] } },
      { _id: 1, name: 1 }
    ).lean();

    const u1 = users.find(u => u._id.toString() === payload.player1Id.toString());
    const u2 = users.find(u => u._id.toString() === payload.player2Id.toString());

    const getFirstName = (name: string): string => {
      if (!name) return 'Player';
      const parts = name.trim().split(/\s+/);
      const first = parts[0] || 'Player';
      return first.charAt(0).toUpperCase() + first.slice(1);
    };

    const p1Name = u1 ? getFirstName(u1.name) : 'Player 1';
    const p2Name = u2 ? getFirstName(u2.name) : 'Player 2';

    pairName = `${p1Name} & ${p2Name}`;
  }

  const pair: any = {
    _id: new Types.ObjectId(),
    player1: new Types.ObjectId(payload.player1Id),
    player2: new Types.ObjectId(payload.player2Id),
    pairName: pairName,
    joinedAt: new Date(),
  } as any;
  dual.registeredPairs.push(pair as any);
  dual.pairCount = dual.registeredPairs.length;

  const addPlayerStanding = (playerId: any) => {
    const exists = dual.pairStandings.some((s: any) => (s.player ?? s.pair)?.toString() === playerId.toString());
    if (!exists) {
      dual.pairStandings.push({
        player: playerId,
        matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesDrawn: 0,
        totalPoints: 0, totalPointsAgainst: 0, pointsDifference: 0,
        wins: 0, losses: 0, draws: 0, rankScore: 0,
      } as any);
    }
  };
  addPlayerStanding(pair.player1);
  addPlayerStanding(pair.player2);

  await dual.save();
  return dual;
};

export const unregisterPair = async (dualId: string, pairId: string, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.status !== 'upcoming') throw new AppError(httpStatus.BAD_REQUEST, 'Cannot remove pair after start');
  const idx = dual.registeredPairs.findIndex(p => p._id?.toString() === pairId);
  if (idx === -1) throw new AppError(httpStatus.NOT_FOUND, 'Pair not found');
  const pairToRemove = dual.registeredPairs[idx];
  dual.registeredPairs.splice(idx, 1);
  if (pairToRemove) {
    const p1Id = pairToRemove.player1.toString();
    const p2Id = pairToRemove.player2.toString();
    dual.pairStandings = dual.pairStandings.filter(s => {
      const pid = (s.player ?? s.pair)?.toString();
      return pid !== p1Id && pid !== p2Id;
    });
  }
  dual.pairCount = dual.registeredPairs.length;
  await dual.save();
  return dual;
};

// Start event
export const startDualAmericano = async (dualId: string, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.createdBy.toString() !== requesterId) throw new AppError(httpStatus.FORBIDDEN, 'Only organizer can start');
  if (dual.status !== 'upcoming') throw new AppError(httpStatus.BAD_REQUEST, 'Not in upcoming status');

  // Always build all C(N,2) partner-pair combinations for the Dual Americano rotation
  await formPairsFromPlayers(dual as IDualAmericano);

  if (dual.pairCount < 4) throw new AppError(httpStatus.BAD_REQUEST, 'Need at least 4 players (2 pairs) to start');

  // Recalculate from actual player count
  dual.numberOfRounds = maxPossibleRounds(dual.pairCount, dual.numberOfCourts);

  dual.status = DualAmericanoStatus.ACTIVE;
  dual.startedAt = new Date();
  _appendNextRound(dual);
  await dual.save();
  return dual;
};

export const generateNextRound = async (dualId: string, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.createdBy.toString() !== requesterId) throw new AppError(httpStatus.FORBIDDEN, 'Only organizer can advance');
  if (dual.status !== DualAmericanoStatus.ACTIVE) throw new AppError(httpStatus.BAD_REQUEST, 'Not active');
  if (dual.currentRound > 0) {
    const currentRound = dual.rounds[dual.currentRound - 1];
    const pending = currentRound?.matches.filter(m => m.status !== 'completed');
    if (pending && pending.length > 0) throw new AppError(httpStatus.BAD_REQUEST, `Round ${dual.currentRound} has ${pending.length} unscored matches`);
  }
  if (dual.currentRound >= dual.numberOfRounds) throw new AppError(httpStatus.BAD_REQUEST, 'All rounds complete');
  if (!canPlayMoreRounds(dual.pairCount, dual.usedMatchups.length, dual.numberOfCourts)) throw new AppError(httpStatus.BAD_REQUEST, 'All partner combinations exhausted');
  _appendNextRound(dual);
  await dual.save();
  return dual;
};

function _appendNextRound(dual: IDualAmericano): void {
  const result = generateDualAmericanoRound(
    dual.registeredPairs as any,
    dual.usedMatchups,
    [],
    dual.numberOfCourts,
  );
  const newRoundNumber = dual.currentRound + 1;
  const matches = result.matches.map(m => ({
    court: m.court,
    pair1: new Types.ObjectId(m.pair1),
    pair2: new Types.ObjectId(m.pair2),
    status: 'pending', score: null, winner: null,
  }));
  dual.rounds.push({ roundNumber: newRoundNumber, matches: matches as any, status: 'pending', byePairs: result.byePairs.map(p => new Types.ObjectId(p)) } as any);
  dual.currentRound = newRoundNumber;
  for (const key of result.newMatchupKeys) {
    if (!dual.usedMatchups.includes(key)) dual.usedMatchups.push(key);
  }
}

export const submitMatchScore = async (dualId: string, roundNumber: number, payload: ISubmitMatchScore, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.status !== 'active') throw new AppError(httpStatus.BAD_REQUEST, 'Not active');
  const round = dual.rounds.find(r => r.roundNumber === roundNumber);
  if (!round) throw new AppError(httpStatus.NOT_FOUND, `Round ${roundNumber} not found`);
  const match = round.matches.find(m => m._id?.toString() === payload.matchId) as IDualAmericanoMatch | undefined;
  if (!match) throw new AppError(httpStatus.NOT_FOUND, 'Match not found');
  if (match.status === DualAmericanoMatchStatus.COMPLETED) throw new AppError(httpStatus.CONFLICT, 'Already scored');
  // find pairs in registry
  const pair1 = dual.registeredPairs.find(p => p._id?.toString() === match.pair1.toString());
  const pair2 = dual.registeredPairs.find(p => p._id?.toString() === match.pair2.toString());
  if (!pair1 || !pair2) throw new AppError(httpStatus.NOT_FOUND, 'Pair not found');
  const participantIds = [pair1.player1.toString(), pair1.player2.toString(), pair2.player1.toString(), pair2.player2.toString()];
  if (!participantIds.includes(requesterId)) throw new AppError(httpStatus.FORBIDDEN, 'Only players of this match can submit the score');
  const totalPair1 = payload.set1Pair1 + (payload.set2Pair1 ?? 0) + (payload.set3Pair1 ?? 0);
  const totalPair2 = payload.set1Pair2 + (payload.set2Pair2 ?? 0) + (payload.set3Pair2 ?? 0);
  const winner: 1 | 2 | null = totalPair1 > totalPair2 ? 1 : totalPair2 > totalPair1 ? 2 : null;
  match.score = {
    set1Pair1: payload.set1Pair1, set1Pair2: payload.set1Pair2,
    set2Pair1: payload.set2Pair1 ?? 0, set2Pair2: payload.set2Pair2 ?? 0,
    set3Pair1: payload.set3Pair1 ?? 0, set3Pair2: payload.set3Pair2 ?? 0,
    totalPointsPair1: totalPair1, totalPointsPair2: totalPair2,
  } as any;
  match.winner = winner;
  match.status = DualAmericanoMatchStatus.COMPLETED;
  match.endTime = new Date();
  _updatePairStandings(dual, match);
  const allDone = round.matches.every(m => m.status === 'completed');
  if (allDone) round.status = DualAmericanoRoundStatus.COMPLETED;
  await dual.save();
  return dual;
};

// Assign court to a match
export const assignCourt = async (dualId: string, roundNumber: number, matchId: string, court: number, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.createdBy.toString() !== requesterId) throw new AppError(httpStatus.FORBIDDEN, 'Only organizer');
  const round = dual.rounds.find(r => r.roundNumber === roundNumber);
  if (!round) throw new AppError(httpStatus.NOT_FOUND, `Round ${roundNumber} not found`);
  const match = round.matches.find(m => m._id?.toString() === matchId);
  if (!match) throw new AppError(httpStatus.NOT_FOUND, 'Match not found');
  match.court = court;
  await dual.save();
  return dual;
};

// Revert standings for a specific match (used before editing a completed match)
function _revertPairStandings(dual: IDualAmericano, match: IDualAmericanoMatch): void {
  const { pair1, pair2, score, winner } = match;
  if (!score) return;
  const p1Score = score.totalPointsPair1;
  const p2Score = score.totalPointsPair2;
  const isDraw = winner === null;

  const p1Doc = dual.registeredPairs.find(p => p._id!.toString() === pair1.toString());
  const p2Doc = dual.registeredPairs.find(p => p._id!.toString() === pair2.toString());
  if (!p1Doc || !p2Doc) return;

  const revertPlayerStanding = (playerId: any, scored: number, conceded: number, wasWinner: boolean) => {
    const s = dual.pairStandings.find((st: any) => (st.player ?? st.pair).toString() === playerId.toString());
    if (!s) return;
    s.matchesPlayed -= 1;
    s.totalPoints -= scored;
    s.totalPointsAgainst -= conceded;
    s.pointsDifference = s.totalPoints - s.totalPointsAgainst;
    if (isDraw) { s.matchesDrawn -= 1; s.draws -= 1; }
    else if (wasWinner) { s.matchesWon -= 1; s.wins -= 1; }
    else { s.matchesLost -= 1; s.losses -= 1; }
    s.rankScore = parseFloat((s.wins * 3 + s.draws * 1 + s.pointsDifference * 0.01).toFixed(4));
  };

  revertPlayerStanding(p1Doc.player1, p1Score, p2Score, winner === 1);
  revertPlayerStanding(p1Doc.player2, p1Score, p2Score, winner === 1);

  revertPlayerStanding(p2Doc.player1, p2Score, p1Score, winner === 2);
  revertPlayerStanding(p2Doc.player2, p2Score, p1Score, winner === 2);
}

// Edit/update an existing match score (supports organizer edits of completed matches)
export const updateMatchScore = async (dualId: string, roundNumber: number, payload: ISubmitMatchScore, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  const round = dual.rounds.find(r => r.roundNumber === roundNumber);
  if (!round) throw new AppError(httpStatus.NOT_FOUND, `Round ${roundNumber} not found`);
  const match = round.matches.find(m => m._id?.toString() === payload.matchId) as IDualAmericanoMatch | undefined;
  if (!match) throw new AppError(httpStatus.NOT_FOUND, 'Match not found');
  const pair1 = dual.registeredPairs.find(p => p._id?.toString() === match.pair1.toString());
  const pair2 = dual.registeredPairs.find(p => p._id?.toString() === match.pair2.toString());
  if (!pair1 || !pair2) throw new AppError(httpStatus.NOT_FOUND, 'Pair not found');
  const participantIds = [pair1.player1.toString(), pair1.player2.toString(), pair2.player1.toString(), pair2.player2.toString()];
  if (!participantIds.includes(requesterId)) throw new AppError(httpStatus.FORBIDDEN, 'Only players of this match can edit the score');
  if (match.status === DualAmericanoMatchStatus.COMPLETED) {
    _revertPairStandings(dual, match);
  }
  const totalPair1 = payload.set1Pair1 + (payload.set2Pair1 ?? 0) + (payload.set3Pair1 ?? 0);
  const totalPair2 = payload.set1Pair2 + (payload.set2Pair2 ?? 0) + (payload.set3Pair2 ?? 0);
  const winner: 1 | 2 | null = totalPair1 > totalPair2 ? 1 : totalPair2 > totalPair1 ? 2 : null;
  match.score = {
    set1Pair1: payload.set1Pair1, set1Pair2: payload.set1Pair2,
    set2Pair1: payload.set2Pair1 ?? 0, set2Pair2: payload.set2Pair2 ?? 0,
    set3Pair1: payload.set3Pair1 ?? 0, set3Pair2: payload.set3Pair2 ?? 0,
    totalPointsPair1: totalPair1, totalPointsPair2: totalPair2,
  } as any;
  match.winner = winner;
  match.status = DualAmericanoMatchStatus.COMPLETED;
  match.endTime = new Date();
  _updatePairStandings(dual, match);
  const allDone = round.matches.every(m => m.status === DualAmericanoMatchStatus.COMPLETED);
  if (allDone) round.status = DualAmericanoRoundStatus.COMPLETED;
  await dual.save();
  return dual;
};

// List leaderboard (pairStandings sorted)
export const getLeaderboard = async (dualId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  const sorted = [...dual.pairStandings].sort((a, b) => b.rankScore !== a.rankScore ? b.rankScore - a.rankScore : b.pointsDifference - a.pointsDifference);
  return sorted;
};

export const getRoundDetails = async (dualId: string, roundNumber: number) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  const round = dual.rounds.find(r => r.roundNumber === roundNumber);
  if (!round) throw new AppError(httpStatus.NOT_FOUND, `Round ${roundNumber} not found`);

  const pairMap = new Map(
    dual.registeredPairs.map((pair) => [pair._id!.toString(), pair]),
  );

  return {
    _id: round._id,
    roundNumber: round.roundNumber,
    status: round.status,
    byePairs: round.byePairs,
    matches: round.matches.map((match) => {
      const pair1 = pairMap.get(match.pair1.toString());
      const pair2 = match.pair2 ? pairMap.get(match.pair2.toString()) : null;

      return {
        _id: match._id,
        court: match.court,
        status: match.status,
        score: match.score,
        winner: match.winner,
        matchDateTime: match.matchDateTime,
        startTime: match.startTime,
        endTime: match.endTime,
        pair1,
        pair2,
      };
    }),
  };
};

export const getPairStats = async (dualId: string, pairId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  const stat = dual.pairStandings.find((s: any) => (s.player ?? s.pair).toString() === pairId.toString());
  if (!stat) throw new AppError(httpStatus.NOT_FOUND, 'Player stats not found');
  return stat;
};

export const getMyPairStats = async (dualId: string, userId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  const stat = dual.pairStandings.find((s: any) => (s.player ?? s.pair).toString() === userId.toString());
  if (!stat) throw new AppError(httpStatus.NOT_FOUND, 'You do not have stats for this event');
  return stat;
};

// Simple messaging
export const sendMessage = async (dualId: string, userId: string, content: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  dual.messages = dual.messages ?? [];
  dual.messages.push({ sender: new Types.ObjectId(userId), content, createdAt: new Date() } as any);
  await dual.save();
  return dual.messages;
};

export const getMessages = async (dualId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  return dual.messages ?? [];
};

function _updatePairStandings(dual: IDualAmericano, match: IDualAmericanoMatch): void {
  const { pair1, pair2, score, winner } = match;
  const p1Score = score?.totalPointsPair1 ?? 0;
  const p2Score = score?.totalPointsPair2 ?? 0;
  const isDraw = winner === null;

  const p1Doc = dual.registeredPairs.find(p => p._id!.toString() === pair1.toString());
  const p2Doc = dual.registeredPairs.find(p => p._id!.toString() === pair2.toString());
  if (!p1Doc || !p2Doc) return;

  const updatePlayerStanding = (playerId: any, scored: number, conceded: number, isWinner: boolean) => {
    const s = dual.pairStandings.find((st: any) => (st.player ?? st.pair).toString() === playerId.toString());
    if (!s) return;
    s.matchesPlayed += 1;
    s.totalPoints += scored;
    s.totalPointsAgainst += conceded;
    s.pointsDifference = s.totalPoints - s.totalPointsAgainst;
    if (isDraw) { s.matchesDrawn += 1; s.draws += 1; }
    else if (isWinner) { s.matchesWon += 1; s.wins += 1; }
    else { s.matchesLost += 1; s.losses += 1; }
    s.rankScore = parseFloat((s.wins * 3 + s.draws * 1 + s.pointsDifference * 0.01).toFixed(4));
  };

  updatePlayerStanding(p1Doc.player1, p1Score, p2Score, winner === 1);
  updatePlayerStanding(p1Doc.player2, p1Score, p2Score, winner === 1);

  updatePlayerStanding(p2Doc.player1, p2Score, p1Score, winner === 2);
  updatePlayerStanding(p2Doc.player2, p2Score, p1Score, winner === 2);
}

export const completeDualAmericano = async (dualId: string, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.createdBy.toString() !== requesterId) throw new AppError(httpStatus.FORBIDDEN, 'Only organizer');
  if (dual.status !== DualAmericanoStatus.ACTIVE) throw new AppError(httpStatus.BAD_REQUEST, 'Not active');
  dual.status = DualAmericanoStatus.COMPLETED;
  dual.completedAt = new Date();
  dual.pairStandings.sort((a, b) => b.rankScore !== a.rankScore ? b.rankScore - a.rankScore : b.pointsDifference - a.pointsDifference);
  await dual.save();
  return dual;
};

// ─────────────────────────────────────────────────────────────────────────────
// MATCH DATE ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

export const assignMatchDateTime = async (
  dualId: string,
  roundNumber: number,
  matchId: string,
  matchDateTime: string,
  requesterId: string,
) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');

  const round = dual.rounds.find(r => r.roundNumber === roundNumber);
  if (!round) throw new AppError(httpStatus.NOT_FOUND, `Round ${roundNumber} not found`);

  const match = round.matches.find(m => m._id?.toString() === matchId) as any;
  if (!match) throw new AppError(httpStatus.NOT_FOUND, 'Match not found');

  const pair1Doc = dual.registeredPairs.find(p => p._id?.toString() === match.pair1.toString());
  const pair2Doc = dual.registeredPairs.find(p => p._id?.toString() === match.pair2.toString());

  const matchPlayerIds = [
    pair1Doc?.player1?.toString(),
    pair1Doc?.player2?.toString(),
    pair2Doc?.player1?.toString(),
    pair2Doc?.player2?.toString(),
  ].filter(Boolean);

  const isOrganizer = dual.createdBy.toString() === requesterId;
  const isMatchPlayer = matchPlayerIds.includes(requesterId);
  if (!isOrganizer && !isMatchPlayer) throw new AppError(httpStatus.FORBIDDEN, 'Only match participants or the organizer can assign match date');

  const oldDateTime = match.matchDateTime;
  const newDateTime = new Date(matchDateTime);

  const dateChanged = !oldDateTime || new Date(oldDateTime).getTime() !== newDateTime.getTime();

  match.matchDateTime = newDateTime;
  dual.markModified('rounds');
  await dual.save();

  if (dateChanged) {
    const userIds = [
      pair1Doc?.player1,
      pair1Doc?.player2,
      pair2Doc?.player1,
      pair2Doc?.player2,
    ].filter(Boolean) as Types.ObjectId[];

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const d = newDateTime;
    const month = monthNames[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    let hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedDate = `${month} ${day}, ${year}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    const pair1Name = pair1Doc?.pairName ?? 'Pair 1';
    const pair2Name = pair2Doc?.pairName ?? 'Pair 2';
    const message = `📅 Match rescheduled: ${pair1Name} vs ${pair2Name} in "${dual.name}" (Round ${roundNumber}) has been set to ${formattedDate}`;

    await sendPushNotification(userIds.map(id => id.toString()), 'Match Rescheduled', message);
    await createAndSendNotifications(userIds, 'Match Rescheduled', message, 'match');
  }

  return dual;
};

// ─────────────────────────────────────────────────────────────────────────────
// PER-MATCH CHAT BETWEEN PAIRS
// ─────────────────────────────────────────────────────────────────────────────

export const createOrGetMatchChat = async (
  dualId: string,
  roundNumber: number,
  matchId: string,
  requesterId: string,
) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');

  const round = dual.rounds.find(r => r.roundNumber === roundNumber);
  if (!round) throw new AppError(httpStatus.NOT_FOUND, `Round ${roundNumber} not found`);

  const match = round.matches.find(m => m._id?.toString() === matchId);
  if (!match) throw new AppError(httpStatus.NOT_FOUND, 'Match not found');

  const pair1Doc = dual.registeredPairs.find(p => p._id?.toString() === match.pair1.toString());
  const pair2Doc = dual.registeredPairs.find(p => p._id?.toString() === match.pair2.toString());
  if (!pair1Doc || !pair2Doc) throw new AppError(httpStatus.NOT_FOUND, 'Pairs not found');

  const participantIds = [
    pair1Doc.player1.toString(),
    pair1Doc.player2.toString(),
    pair2Doc.player1.toString(),
    pair2Doc.player2.toString(),
  ];

  if (!participantIds.includes(requesterId) && dual.createdBy.toString() !== requesterId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant of this match');
  }

  let chat = await DualAmericanoChat.findOne({ dualAmericano: dualId, matchId });

  if (!chat) {
    chat = await DualAmericanoChat.create({
      name: `${pair1Doc.pairName ?? 'Pair 1'} vs ${pair2Doc.pairName ?? 'Pair 2'}`,
      dualAmericano: new Types.ObjectId(dualId),
      matchId: new Types.ObjectId(matchId),
      roundNumber,
      pair1: pair1Doc._id,
      pair2: pair2Doc._id,
    });
  }

  return chat;
};

export const sendMatchChatMessage = async (
  dualId: string,
  chatId: string,
  message: string,
  requesterId: string,
) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');

  const chat = await DualAmericanoChat.findById(chatId);
  if (!chat) throw new AppError(httpStatus.NOT_FOUND, 'Chat not found');
  if (chat.dualAmericano.toString() !== dualId) throw new AppError(httpStatus.FORBIDDEN, 'Chat does not belong to this event');

  const matchInRound = dual.rounds
    .flatMap(r => r.matches)
    .find(m => m._id?.toString() === chat.matchId.toString());
  if (!matchInRound) throw new AppError(httpStatus.NOT_FOUND, 'Match not found');

  const pair1Doc = dual.registeredPairs.find(p => p._id?.toString() === matchInRound.pair1.toString());
  const pair2Doc = dual.registeredPairs.find(p => p._id?.toString() === matchInRound.pair2.toString());

  const participantIds = [
    pair1Doc?.player1?.toString(),
    pair1Doc?.player2?.toString(),
    pair2Doc?.player1?.toString(),
    pair2Doc?.player2?.toString(),
  ].filter(Boolean);

  if (!participantIds.includes(requesterId) && dual.createdBy.toString() !== requesterId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to send messages in this chat');
  }

  const newMsg = {
    text: message,
    sender: new Types.ObjectId(requesterId),
    date: new Date(),
    read: false,
  };
  chat.messages.push(newMsg as any);
  await chat.save();

  const saved = await DualAmericanoChat.findById(chatId)
    .select({ messages: { $slice: -1 } })
    .populate('messages.sender', 'name profileImage');

  // Notify other participants via socket
  const otherIds = participantIds.filter(id => id !== requesterId) as string[];
  if (otherIds.length > 0) {
    const sender = await User.findById(requesterId, 'name').lean();
    const senderName = (sender as any)?.name ?? 'A player';
    const notifMsg = `💬 New message from ${senderName} in "${chat.name}" chat`;
    await createAndSendNotifications(otherIds, 'New Chat Message', notifMsg, 'general');
  }

  return saved?.messages[0];
};

export const getMatchChat = async (
  dualId: string,
  chatId: string,
  requesterId: string,
) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');

  const chat = await DualAmericanoChat.findById(chatId).populate('messages.sender', 'name profileImage');
  if (!chat) throw new AppError(httpStatus.NOT_FOUND, 'Chat not found');
  if (chat.dualAmericano.toString() !== dualId) throw new AppError(httpStatus.FORBIDDEN, 'Chat does not belong to this event');

  const matchInRound = dual.rounds
    .flatMap(r => r.matches)
    .find(m => m._id?.toString() === chat.matchId.toString());

  const pair1Doc = dual.registeredPairs.find(p => p._id?.toString() === (matchInRound?.pair1?.toString() ?? ''));
  const pair2Doc = dual.registeredPairs.find(p => p._id?.toString() === (matchInRound?.pair2?.toString() ?? ''));

  const participantIds = [
    pair1Doc?.player1?.toString(),
    pair1Doc?.player2?.toString(),
    pair2Doc?.player1?.toString(),
    pair2Doc?.player2?.toString(),
  ].filter(Boolean);

  if (!participantIds.includes(requesterId) && dual.createdBy.toString() !== requesterId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to view this chat');
  }

  return chat;
};

export const getMyDualAmericanoChats = async (dualId: string, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');

  const uid = new Types.ObjectId(requesterId);

  const myPairs = dual.registeredPairs.filter(
    p => p.player1.toString() === requesterId || p.player2.toString() === requesterId,
  );
  const myPairIds = myPairs.map(p => p._id);

  const chats = await DualAmericanoChat.find({
    dualAmericano: new Types.ObjectId(dualId),
    $or: [{ pair1: { $in: myPairIds } }, { pair2: { $in: myPairIds } }],
  })
    .select({ messages: { $slice: -1 } })
    .populate('messages.sender', 'name profileImage')
    .sort({ updatedAt: -1 });

  return chats;
};
