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
import User from '../user/user.model';
import { formPairsFromPlayers } from './dualAmericano.helpers';
import { canPlayMoreRounds, generateDualAmericanoRound, maxPossibleRounds, recommendedRounds } from './dualAmericano.pairing';

// Create event
export const createDualAmericano = async (payload: any, createdBy: string) => {
  // Estimate player count from maxPairs so recommendedRounds uses the right formula
  const estimatedPlayers = payload.maxPairs * 2;
  const defaultRounds = recommendedRounds(estimatedPlayers, payload.numberOfCourts);
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  return DualAmericano.create({
    ...payload,
    createdBy: new Types.ObjectId(createdBy),
    club: new Types.ObjectId(payload.club),
    league: payload.league ? new Types.ObjectId(payload.league) : null,
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
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
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
  const pair: any = {
    _id: new Types.ObjectId(),
    player1: new Types.ObjectId(payload.player1Id),
    player2: new Types.ObjectId(payload.player2Id),
    pairName: payload.pairName ?? null,
    joinedAt: new Date(),
  } as any;
  dual.registeredPairs.push(pair as any);
  dual.pairCount = dual.registeredPairs.length;
  // add one standing row for the pair
  dual.pairStandings.push({
    pair: pair._id as any,
    pairName: pair.pairName ?? null,
    player1: pair.player1 as any,
    player2: pair.player2 as any,
    matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesDrawn: 0,
    totalPoints: 0, totalPointsAgainst: 0, pointsDifference: 0,
    wins: 0, losses: 0, draws: 0, rankScore: 0,
  } as any);
  await dual.save();
  return dual;
};

export const unregisterPair = async (dualId: string, pairId: string, requesterId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  if (dual.status !== 'upcoming') throw new AppError(httpStatus.BAD_REQUEST, 'Cannot remove pair after start');
  const idx = dual.registeredPairs.findIndex(p => p._id?.toString() === pairId);
  if (idx === -1) throw new AppError(httpStatus.NOT_FOUND, 'Pair not found');
  dual.registeredPairs.splice(idx, 1);
  dual.pairStandings = dual.pairStandings.filter(s => s.pair.toString() !== pairId);
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
  formPairsFromPlayers(dual as IDualAmericano);

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
  if (!participantIds.includes(requesterId) && dual.createdBy.toString() !== requesterId) throw new AppError(httpStatus.FORBIDDEN, 'Only participants or organizer can submit scores');
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
  const revert = (pairId: any, scored: number, conceded: number, wasWinner: boolean) => {
    const s = dual.pairStandings.find(st => st.pair.toString() === pairId.toString());
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
  revert(pair1, p1Score, p2Score, winner === 1);
  revert(pair2, p2Score, p1Score, winner === 2);
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
  const isOrganizer = dual.createdBy.toString() === requesterId;
  if (!participantIds.includes(requesterId) && !isOrganizer) throw new AppError(httpStatus.FORBIDDEN, 'Only participants or organizer can edit scores');
  // if match already completed, and organizer is editing, revert previous standings first
  if (match.status === DualAmericanoMatchStatus.COMPLETED) {
    if (!isOrganizer) throw new AppError(httpStatus.FORBIDDEN, 'Only organizer can edit a completed match');
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
  return round;
};

export const getPairStats = async (dualId: string, pairId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  const stat = dual.pairStandings.find(s => s.pair.toString() === pairId);
  if (!stat) throw new AppError(httpStatus.NOT_FOUND, 'Pair standings not found');
  return stat;
};

export const getMyPairStats = async (dualId: string, userId: string) => {
  const dual = await DualAmericano.findOne({ _id: dualId, isDeleted: false });
  if (!dual) throw new AppError(httpStatus.NOT_FOUND, 'Dual Americano not found');
  const stat = dual.pairStandings.find(s => s.player1.toString() === userId || s.player2.toString() === userId);
  if (!stat) throw new AppError(httpStatus.NOT_FOUND, 'You are not in a pair for this event');
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
  const updateStanding = (pairId: any, scored: number, conceded: number, isWinner: boolean) => {
    const s = dual.pairStandings.find(st => st.pair.toString() === pairId.toString());
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
  updateStanding(pair1, p1Score, p2Score, winner === 1);
  updateStanding(pair2, p2Score, p1Score, winner === 2);
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
