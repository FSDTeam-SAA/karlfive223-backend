/**
 * COPILOT TASK: Generate the Dual Americano module.
 */

import { Schema, model } from 'mongoose';
import { DualAmericanoMatchStatus, DualAmericanoRoundStatus, DualAmericanoStatus, IDualAmericano } from './dualAmericano.interface';

const matchScoreSchema = new Schema({
  set1Pair1: { type: Number, required: true, min: 0 },
  set1Pair2: { type: Number, required: true, min: 0 },
  set2Pair1: { type: Number, default: 0, min: 0 },
  set2Pair2: { type: Number, default: 0, min: 0 },
  set3Pair1: { type: Number, default: 0, min: 0 },
  set3Pair2: { type: Number, default: 0, min: 0 },
  totalPointsPair1: { type: Number, required: true, min: 0 },
  totalPointsPair2: { type: Number, required: true, min: 0 },
}, { _id: false });

const matchSchema = new Schema({
  court: { type: Number, required: true, min: 1 },
  pair1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pair2: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: matchScoreSchema, default: null },
  winner: { type: Number, enum: [1, 2, null], default: null },
  status: { type: String, enum: Object.values(DualAmericanoMatchStatus), default: DualAmericanoMatchStatus.PENDING },
  matchDateTime: { type: Date, default: null },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
}, { _id: true });

const roundSchema = new Schema({
  roundNumber: { type: Number, required: true, min: 1 },
  matches: { type: [matchSchema], default: [] },
  status: { type: String, enum: Object.values(DualAmericanoRoundStatus), default: DualAmericanoRoundStatus.PENDING },
  byePairs: [{ type: Schema.Types.ObjectId, ref: 'Pair' }],
}, { _id: true });

const pairSchema = new Schema({
  player1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  player2: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pairName: { type: String, default: null },
  joinedAt: { type: Date, default: Date.now },
}, { _id: true });

const pairStandingSchema = new Schema({
  pair: { type: Schema.Types.ObjectId, default: null },
  pairName: { type: String, default: null },
  player: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  playerName: { type: String, default: null },
  player1: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  player2: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  matchesLost: { type: Number, default: 0 },
  matchesDrawn: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  totalPointsAgainst: { type: Number, default: 0 },
  pointsDifference: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  rankScore: { type: Number, default: 0 },
}, { _id: false });

const dualSchema = new Schema<IDualAmericano>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: null },
  // club: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
  // league: { type: Schema.Types.ObjectId, ref: 'League', default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  numberOfCourts: { type: Number, required: true, min: 1 },
  maxPairs: { type: Number, required: true, min: 2 },
  pointsPerSet: { type: Number, default: 21, min: 1 },
  setsPerMatch: { type: Number, default: 1, enum: [1, 3] },
  numberOfRounds: { type: Number, default: 0 },
  registeredPairs: { type: [pairSchema], default: [] },
  // players register individually; pairs are formed automatically on start
  registeredPlayers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  pairCount: { type: Number, default: 0 },
  rounds: { type: [roundSchema], default: [] },
  // simple messaging between participants/organizer for this event
  messages: [{ sender: { type: Schema.Types.ObjectId, ref: 'User' }, content: { type: String }, createdAt: { type: Date, default: Date.now } }],
  joinCode: { type: String, default: null },
  currentRound: { type: Number, default: 0 },
  pairStandings: { type: [pairStandingSchema], default: [] },
  usedMatchups: { type: [String], default: [] },
  status: { type: String, enum: Object.values(DualAmericanoStatus), default: DualAmericanoStatus.UPCOMING },
  scheduledAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

dualSchema.index({ club: 1, status: 1 });
dualSchema.index({ league: 1 });
dualSchema.index({ createdBy: 1 });
dualSchema.index({ 'registeredPairs.player1': 1 });
dualSchema.index({ 'registeredPairs.player2': 1 });

const DualAmericano = model<IDualAmericano>('DualAmericano', dualSchema);
export default DualAmericano;
