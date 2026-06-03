/**
 * COPILOT TASK: Generate the Dual Americano module.
 *
 * (See project COPILOT_PROMPT for full instructions.)
 */

import { Document, Types } from 'mongoose';

export enum DualAmericanoStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DualAmericanoRoundStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum DualAmericanoMatchStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface IDualAmericanoPair {
  _id?: Types.ObjectId;
  player1: Types.ObjectId;
  player2: Types.ObjectId;
  pairName?: string | null;
  joinedAt?: Date;
}

export interface IDualAmericanoMatchScore {
  set1Pair1: number;
  set1Pair2: number;
  set2Pair1?: number;
  set2Pair2?: number;
  set3Pair1?: number;
  set3Pair2?: number;
  totalPointsPair1: number;
  totalPointsPair2: number;
}

export interface IDualAmericanoMatch {
  _id?: Types.ObjectId;
  court: number;
  pair1: Types.ObjectId;
  pair2: Types.ObjectId;
  score?: IDualAmericanoMatchScore | null;
  winner?: 1 | 2 | null;
  status: DualAmericanoMatchStatus;
  startTime?: Date;
  endTime?: Date;
}

export interface IDualAmericanoRound {
  _id?: Types.ObjectId;
  roundNumber: number;
  matches: IDualAmericanoMatch[];
  status: DualAmericanoRoundStatus;
  byePairs?: Types.ObjectId[];
}

export interface IDualAmericanoStanding {
  pair?: Types.ObjectId;
  pairName?: string | null;
  player?: Types.ObjectId;
  playerName?: string | null;
  player1?: Types.ObjectId;
  player2?: Types.ObjectId;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  totalPoints: number;
  totalPointsAgainst: number;
  pointsDifference: number;
  wins: number;
  losses: number;
  draws: number;
  rankScore: number;
}

export interface IDualAmericano extends Document {
  name: string;
  description?: string;
  club: Types.ObjectId;
  league?: Types.ObjectId;
  createdBy: Types.ObjectId;
  numberOfCourts: number;
  maxPairs: number; // number of pairs allowed
  pointsPerSet: number;
  setsPerMatch: number;
  numberOfRounds: number;
  registeredPairs: IDualAmericanoPair[]; // subdocs (created after pairing)
  registeredPlayers: Types.ObjectId[]; // players register individually
  pairCount: number;
  joinCode?: string; // code/OTP to join event
  rounds: IDualAmericanoRound[];
  messages?: { sender: Types.ObjectId; content: string; createdAt: Date }[];
  currentRound: number;
  pairStandings: IDualAmericanoStanding[];
  usedMatchups: string[]; // canonical matchup keys between pairIds
  status: DualAmericanoStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateDualAmericano {
  name: string;
  description?: string;
  club: string;
  league?: string;
  numberOfCourts: number;
  maxPairs: number;
  pointsPerSet?: number;
  setsPerMatch?: number;
  numberOfRounds?: number;
  scheduledAt?: string;
}

export interface IRegisterPair {
  player1Id: string;
  player2Id: string;
  pairName?: string;
}

export interface ISubmitMatchScore {
  matchId: string;
  set1Pair1: number;
  set1Pair2: number;
  set2Pair1?: number;
  set2Pair2?: number;
  set3Pair1?: number;
  set3Pair2?: number;
}
