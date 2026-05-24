<<<<<<< HEAD
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
  Auth('admin', 'organizer', 'user'),
  validateRequest(createDualAmericanoZodSchema),
  controller.create,
);

// Update event config (before start only)
router.patch(
  '/:id',
  Auth('admin', 'organizer', 'user'),
  validateRequest(updateDualAmericanoZodSchema),
  controller.update,
);

// Soft delete
router.delete(
  '/:id',
  Auth('admin', 'organizer', 'user'),
  controller.remove,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: PAIR REGISTRATION
// Players register as a fixed pair (they stay together all event)
// ─────────────────────────────────────────────────────────────────────────────

// Any player can register themselves as part of a pair
router.post(
  '/:id/join-pair',
  Auth('admin', 'organizer', 'user'),
  validateRequest(registerPairZodSchema),
  controller.registerPair,
);

// Single-player join via join code
router.post(
  '/:id/join',
  Auth('user'),
  validateRequest(require('./dualAmericano.validation').joinByCodeZodSchema),
  controller.joinByCode,
);

// Either player in the pair OR organizer can unregister the pair
router.delete(
  '/:id/leave-pair/:pairId',
  Auth('admin', 'organizer', 'user'),
  controller.unregisterPair,
);

// Organizer can also explicitly add a pair
router.post(
  '/:id/pairs',
  Auth('admin', 'organizer'),
  validateRequest(registerPairZodSchema),
  controller.registerPair,
);

// Organizer removes a specific pair by pairId
router.delete(
  '/:id/pairs/:pairId',
  Auth('admin', 'organizer'),
  controller.unregisterPair,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: EVENT LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

// Start event → generates Round 1 matchups immediately
router.post(
  '/:id/start',
  Auth('admin', 'organizer', 'user'),
  controller.start,
);

// Advance to next round (all current-round scores must be submitted first)
// New matchups generated; any used pair vs pair matchup is permanently blocked
router.post(
  '/:id/next-round',
  Auth('admin', 'organizer', 'user'),
  controller.nextRound,
);

// Mark event as complete + finalise pair standings sort
router.post(
  '/:id/complete',
  Auth('admin', 'organizer', 'user'),
  controller.complete,
);

// Cancel the event
router.post(
  '/:id/cancel',
  Auth('admin', 'organizer', 'user'),
  controller.cancel,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: SCORE SUBMISSION
// Points go to the PAIR as a unit (one standing update per pair, not per player)
// ─────────────────────────────────────────────────────────────────────────────

// First-time score submit
router.post(
  '/:id/rounds/:roundNumber/score',
  Auth('admin', 'organizer', 'user'),
  validateRequest(submitScoreZodSchema),
  controller.submitScore,
);

// Edit an existing score (organizer only for completed matches)
router.patch(
  '/:id/rounds/:roundNumber/score',
  Auth('admin', 'organizer', 'user'),
  validateRequest(submitScoreZodSchema),
  controller.updateScore,
);

// Organizer reassigns a court number to a match
router.post(
  '/:id/rounds/:roundNumber/matches/:matchId/assign-court',
  Auth('admin', 'organizer'),
  validateRequest(assignCourtZodSchema),
  controller.assignCourt,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: MY STATS & MESSAGING
// ─────────────────────────────────────────────────────────────────────────────

// Logged-in user's own pair stats
router.get(
  '/:id/me/stats',
  Auth('admin', 'organizer', 'user'),
  controller.myPairStats,
);

// Event chat: post and read messages
router.post(
  '/:id/messages',
  Auth('admin', 'organizer', 'user'),
  validateRequest(sendMessageZodSchema),
  controller.sendMessage,
);

router.get(
  '/:id/messages',
  Auth('admin', 'organizer', 'user'),
  controller.getMessages,
);

export const DualAmericanoRoutes = router;
=======
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
  Auth('admin', 'organizer', 'user'),
  validateRequest(createDualAmericanoZodSchema),
  controller.create,
);

// Update event config (before start only)
router.patch(
  '/:id',
  Auth('admin', 'organizer', 'user'),
  validateRequest(updateDualAmericanoZodSchema),
  controller.update,
);

// Soft delete
router.delete(
  '/:id',
  Auth('admin', 'organizer', 'user'),
  controller.remove,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: PAIR REGISTRATION
// Players register as a fixed pair (they stay together all event)
// ─────────────────────────────────────────────────────────────────────────────

// Any player can register themselves as part of a pair
router.post(
  '/:id/join-pair',
  Auth('admin', 'organizer', 'user'),
  validateRequest(registerPairZodSchema),
  controller.registerPair,
);

// Single-player join via join code
router.post(
  '/:id/join',
  Auth('user'),
  validateRequest(require('./dualAmericano.validation').joinByCodeZodSchema),
  controller.joinByCode,
);

// Either player in the pair OR organizer can unregister the pair
router.delete(
  '/:id/leave-pair/:pairId',
  Auth('admin', 'organizer', 'user'),
  controller.unregisterPair,
);

// Organizer can also explicitly add a pair
router.post(
  '/:id/pairs',
  Auth('admin', 'organizer'),
  validateRequest(registerPairZodSchema),
  controller.registerPair,
);

// Organizer removes a specific pair by pairId
router.delete(
  '/:id/pairs/:pairId',
  Auth('admin', 'organizer'),
  controller.unregisterPair,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: EVENT LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

// Start event → generates Round 1 matchups immediately
router.post(
  '/:id/start',
  Auth('admin', 'organizer', 'user'),
  controller.start,
);

// Advance to next round (all current-round scores must be submitted first)
// New matchups generated; any used pair vs pair matchup is permanently blocked
router.post(
  '/:id/next-round',
  Auth('admin', 'organizer', 'user'),
  controller.nextRound,
);

// Mark event as complete + finalise pair standings sort
router.post(
  '/:id/complete',
  Auth('admin', 'organizer', 'user'),
  controller.complete,
);

// Cancel the event
router.post(
  '/:id/cancel',
  Auth('admin', 'organizer', 'user'),
  controller.cancel,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: SCORE SUBMISSION
// Points go to the PAIR as a unit (one standing update per pair, not per player)
// ─────────────────────────────────────────────────────────────────────────────

// First-time score submit
router.post(
  '/:id/rounds/:roundNumber/score',
  Auth('admin', 'organizer', 'user'),
  validateRequest(submitScoreZodSchema),
  controller.submitScore,
);

// Edit an existing score (organizer only for completed matches)
router.patch(
  '/:id/rounds/:roundNumber/score',
  Auth('admin', 'organizer', 'user'),
  validateRequest(submitScoreZodSchema),
  controller.updateScore,
);

// Organizer reassigns a court number to a match
router.post(
  '/:id/rounds/:roundNumber/matches/:matchId/assign-court',
  Auth('admin', 'organizer'),
  validateRequest(assignCourtZodSchema),
  controller.assignCourt,
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED: MY STATS & MESSAGING
// ─────────────────────────────────────────────────────────────────────────────

// Logged-in user's own pair stats
router.get(
  '/:id/me/stats',
  Auth('admin', 'organizer', 'user'),
  controller.myPairStats,
);

// Event chat: post and read messages
router.post(
  '/:id/messages',
  Auth('admin', 'organizer', 'user'),
  validateRequest(sendMessageZodSchema),
  controller.sendMessage,
);

router.get(
  '/:id/messages',
  Auth('admin', 'organizer', 'user'),
  controller.getMessages,
);

export const DualAmericanoRoutes = router;
>>>>>>> 8e6952544e811c266e42354abebb9517d4d8c878
export default router;