/**
 * COPILOT TASK: Generate the Dual Americano module.
 */

import { z } from 'zod';
const objectIdRegex = /^[a-f\d]{24}$/i;

export const createDualAmericanoZodSchema = z.object({
  body: z.object({
    name: z.string().min(3, { message: 'Name is required' }).max(100).trim(),
    description: z.string().max(500).trim().optional(),
    club: z.string().regex(objectIdRegex, { message: 'Invalid club ID' }),
    league: z.string().regex(objectIdRegex, 'Invalid league ID').optional(),
    numberOfCourts: z.number().int().min(1, { message: 'Courts required' }).max(20),
    maxPairs: z.number().int().min(2, { message: 'Max pairs required' }).max(64),
    pointsPerSet: z.number().int().min(1).max(100).default(21).optional(),
    setsPerMatch: z.literal(1).or(z.literal(3)).default(1).optional(),
    numberOfRounds: z.number().int().min(1).max(100).optional(),
    scheduledAt: z.string().datetime().optional(),
  }),
});

export const updateDualAmericanoZodSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100).trim().optional(),
    description: z.string().max(500).trim().optional(),
    numberOfCourts: z.number().int().min(1).max(20).optional(),
    maxPairs: z.number().int().min(2).max(64).optional(),
    pointsPerSet: z.number().int().min(1).max(100).optional(),
    setsPerMatch: z.literal(1).or(z.literal(3)).optional(),
    numberOfRounds: z.number().int().min(1).max(100).optional(),
    scheduledAt: z.string().datetime().optional(),
  }),
});

export const registerPairZodSchema = z.object({
  body: z.object({
    player1Id: z.string().regex(objectIdRegex, { message: 'Invalid player1 id' }),
    player2Id: z.string().regex(objectIdRegex, { message: 'Invalid player2 id' }),
    pairName: z.string().max(100).optional(),
  }).refine(d => d.player1Id !== d.player2Id, { message: 'A player cannot pair with themselves' }),
});

export const joinByCodeZodSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(20),
  }),
});

export const submitScoreZodSchema = z.object({
  body: z.object({
    matchId: z.string().regex(objectIdRegex, { message: 'Invalid match id' }),
    set1Pair1: z.number().int().min(0, { message: 'Required' }),
    set1Pair2: z.number().int().min(0, { message: 'Required' }),
    set2Pair1: z.number().int().min(0).optional(),
    set2Pair2: z.number().int().min(0).optional(),
    set3Pair1: z.number().int().min(0).optional(),
    set3Pair2: z.number().int().min(0).optional(),
  }),
});

export const assignCourtZodSchema = z.object({
  body: z.object({
    court: z.number().int().min(1),
  }),
});

export const sendMessageZodSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(1000),
  }),
});
