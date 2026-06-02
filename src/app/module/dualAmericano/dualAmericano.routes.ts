import { Router } from 'express';
import Auth from '../../middlewares/Auth';
import validateRequest from '../../middlewares/requestValidation';
import * as controller from './dualAmericano.controller';
import {
    assignCourtZodSchema,
    createDualAmericanoZodSchema,
    registerPairZodSchema,
    sendMessageZodSchema,
    submitScoreZodSchema,
    updateDualAmericanoZodSchema,
} from './dualAmericano.validation';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC (no auth)
// ─────────────────────────────────────────────────────────────────────────────

// List all events (filterable: ?status=&club=&league=&page=&limit=)
router.get('/', controller.getAll);

// Single event full details
router.get('/:id', controller.getById);

// Single event all matches
router.get('/:id/matches', controller.getAllMatchesByEvent);

// Single event players list
router.get('/:id/players', controller.getPlayersByEvent);

// All events for a specific club
router.get('/club/:clubId', controller.getByClub);

// Live leaderboard (pair standings sorted by rankScore)
router.get('/:id/leaderboard', controller.leaderboard);

// Round detail (matches enriched with pair player info)
router.get('/:id/rounds/:roundNumber', controller.roundDetails);

// Any pair's stats
router.get('/:id/pairs/:pairId/stats', controller.pairStats);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: CRUD
// ─────────────────────────────────────────────────────────────────────────────

// Create a Dual Americano event
router.post(
  '/',
  Auth('admin', 'manager', 'player'),
  validateRequest(createDualAmericanoZodSchema),
  controller.create,
);

// Update event config (before start only)
router.patch(
  '/:id',
  Auth('admin', 'manager', 'player'),
  validateRequest(updateDualAmericanoZodSchema),
  controller.update,
);

// Soft delete
router.delete(
  '/:id',
  Auth('admin', 'manager', 'player'),
  controller.remove,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: PAIR REGISTRATION
// Players register as a fixed pair (they stay together all event)
// ─────────────────────────────────────────────────────────────────────────────

// Any player can register themselves as part of a pair
router.post(
  '/:id/join-pair',
  Auth('admin', 'manager', 'player'),
  validateRequest(registerPairZodSchema),
  controller.registerPair,
);

// Single-player join via join code
router.post(
  '/:id/join',
  Auth('player'),
  validateRequest(require('./dualAmericano.validation').joinByCodeZodSchema),
  controller.joinByCode,
);

// Either player in the pair OR manager can unregister the pair
router.delete(
  '/:id/leave-pair/:pairId',
  Auth('admin', 'manager', 'player'),
  controller.unregisterPair,
);

// manager can also explicitly add a pair
router.post(
  '/:id/pairs',
  Auth('admin', 'manager'),
  validateRequest(registerPairZodSchema),
  controller.registerPair,
);

// manager removes a specific pair by pairId
router.delete(
  '/:id/pairs/:pairId',
  Auth('admin', 'manager'),
  controller.unregisterPair,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: EVENT LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

// Start event → generates Round 1 matchups immediately
router.post(
  '/:id/start',
  Auth('admin', 'manager', 'player'),
  controller.start,
);

// Advance to next round (all current-round scores must be submitted first)
// New matchups generated; any used pair vs pair matchup is permanently blocked
router.post(
  '/:id/next-round',
  Auth('admin', 'manager', 'player'),
  controller.nextRound,
);

// Mark event as complete + finalise pair standings sort
router.post(
  '/:id/complete',
  Auth('admin', 'manager', 'player'),
  controller.complete,
);

// Cancel the event
router.post(
  '/:id/cancel',
  Auth('admin', 'manager', 'player'),
  controller.cancel,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: SCORE SUBMISSION
// Points go to the PAIR as a unit (one standing update per pair, not per player)
// ─────────────────────────────────────────────────────────────────────────────

// First-time score submit
router.post(
  '/:id/rounds/:roundNumber/score',
  Auth('admin', 'manager', 'player'),
  validateRequest(submitScoreZodSchema),
  controller.submitScore,
);

// Edit an existing score (manager only for completed matches)
router.patch(
  '/:id/rounds/:roundNumber/score',
  Auth('admin', 'manager', 'player'),
  validateRequest(submitScoreZodSchema),
  controller.updateScore,
);

// manager reassigns a court number to a match
router.post(
  '/:id/rounds/:roundNumber/matches/:matchId/assign-court',
  Auth('admin', 'manager'),
  validateRequest(assignCourtZodSchema),
  controller.assignCourt,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: MY STATS & MESSAGING
// ─────────────────────────────────────────────────────────────────────────────

// Logged-in user's own pair stats
router.get(
  '/:id/me/stats',
  Auth('admin', 'manager', 'player'),
  controller.myPairStats,
);

// Event chat: post and read messages
router.post(
  '/:id/messages',
  Auth('admin', 'manager', 'player'),
  validateRequest(sendMessageZodSchema),
  controller.sendMessage,
);

router.get(
  '/:id/messages',
  Auth('admin', 'manager', 'player'),
  controller.getMessages,
);

export const DualAmericanoRoutes = router;
export default router;
