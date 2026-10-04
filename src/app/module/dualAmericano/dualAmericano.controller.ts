/**
 * COPILOT TASK: Generate the Dual Americano module.
 */

import { Request, Response } from 'express';
import sendResponse from '../../utils/sendRespopnse';
import * as service from './dualAmericano.service';

export const create = async (req: Request, res: Response) => {
  const payload = req.body;
  const created = await service.createDualAmericano(payload, req.user._id.toString());
  return sendResponse(res, { statusCode: 201, success: true, message: 'Dual Americano created', data: created });
};

export const getAll = async (req: Request, res: Response) => {
  const { status, club, league, page = 1, limit = 20 } = req.query as any;
  const data = await service.getAll({ status, club, league }, Number(page), Number(limit));
  return sendResponse(res, { statusCode: 200, success: true, message: 'Dual Americano list', data });
};

export const getById = async (req: Request, res: Response) => {
  const data = await service.getById(req.params.id);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Dual Americano', data });
};

export const getAllMatchesByEvent = async (req: Request, res: Response) => {
  const data = await service.getAllMatchesByEvent(req.params.id);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Event matches', data });
};

export const getPlayersByEvent = async (req: Request, res: Response) => {
  const data = await service.getPlayersByEvent(req.params.id);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Event players', data });
};

export const getByClub = async (req: Request, res: Response) => {
  const data = await service.getByClub(req.params.clubId);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Dual Americano by club', data });
};

export const getMyEvents = async (req: Request, res: Response) => {
  const { status, league, page = 1, limit = 20 } = req.query as any;
  const userId = req.user._id.toString();
  const data = await service.getMyEvents(userId, { status, league }, Number(page), Number(limit));
  return sendResponse(res, { statusCode: 200, success: true, message: 'My Dual Americano events', data });
};

export const joinByCode = async (req: Request, res: Response) => {
  const { code } = req.body;
  const updated = await service.joinByCode(req.params.id, req.user._id.toString(), code);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Joined event', data: updated });
};

// Global join-by-code: the caller only has the event's joinCode, not its id
// (mirrors the Single Americano `/americano/join-by-otp` pattern). The service
// already resolves the event purely from `code`, so no id is required here.
export const joinByCodeGlobal = async (req: Request, res: Response) => {
  const { code } = req.body;
  const updated = await service.joinByCode('', req.user._id.toString(), code);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Joined event', data: updated });
};

export const getJoinCode = async (req: Request, res: Response) => {
  const dual = await service.getById(req.params.id);
  if (!dual) return sendResponse(res, { statusCode: 404, success: false, message: 'Not found', data: null });
  if (dual.createdBy.toString() !== req.user._id.toString()) return sendResponse(res, { statusCode: 403, success: false, message: 'Only owner can view code', data: null });
  return sendResponse(res, { statusCode: 200, success: true, message: 'Join code', data: { joinCode: dual.joinCode } });
};

export const registerPair = async (req: Request, res: Response) => {
  const payload = req.body;
  const updated = await service.registerPair(req.params.id, payload, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Pair registered', data: updated });
};

export const unregisterPair = async (req: Request, res: Response) => {
  const { pairId } = req.params;
  const updated = await service.unregisterPair(req.params.id, pairId, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Pair removed', data: updated });
};

export const start = async (req: Request, res: Response) => {
  const started = await service.startDualAmericano(req.params.id, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Dual Americano started', data: started });
};

export const nextRound = async (req: Request, res: Response) => {
  const advanced = await service.generateNextRound(req.params.id, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Round generated', data: advanced });
};

export const submitScore = async (req: Request, res: Response) => {
  const payload = req.body;
  const updated = await service.saveMatchScore(req.params.id, Number(req.params.roundNumber), payload, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Score saved', data: updated });
};

export const updateScore = async (req: Request, res: Response) => {
  const payload = req.body;
  const updated = await service.saveMatchScore(req.params.id, Number(req.params.roundNumber), payload, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Score updated', data: updated });
};

export const assignCourt = async (req: Request, res: Response) => {
  const { court } = req.body;
  const updated = await service.assignCourt(req.params.id, Number(req.params.roundNumber), req.params.matchId, Number(court), req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Court assigned', data: updated });
};

export const leaderboard = async (req: Request, res: Response) => {
  const list = await service.getLeaderboard(req.params.id);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Leaderboard', data: list });
};

export const roundDetails = async (req: Request, res: Response) => {
  const round = await service.getRoundDetails(req.params.id, Number(req.params.roundNumber));
  return sendResponse(res, { statusCode: 200, success: true, message: `Round ${req.params.roundNumber}`, data: round });
};

export const pairStats = async (req: Request, res: Response) => {
  const stat = await service.getPairStats(req.params.id, req.params.pairId);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Pair stats', data: stat });
};

export const myPairStats = async (req: Request, res: Response) => {
  const stat = await service.getMyPairStats(req.params.id, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'My pair stats', data: stat });
};

export const sendMessage = async (req: Request, res: Response) => {
  const { content } = req.body;
  const msgs = await service.sendMessage(req.params.id, req.user._id.toString(), content);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Message sent', data: msgs });
};

export const getMessages = async (req: Request, res: Response) => {
  const msgs = await service.getMessages(req.params.id);
  return sendResponse(res, { statusCode: 200, success: true, message: 'Messages', data: msgs });
};

export const update = async (req: Request, res: Response) => {
  const updated = await service.updateDualAmericano(req.params.id, req.body, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Dual Americano updated', data: updated });
};

export const remove = async (req: Request, res: Response) => {
  const removed = await service.removeDualAmericano(req.params.id, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Dual Americano removed', data: removed });
};

export const cancel = async (req: Request, res: Response) => {
  const cancelled = await service.cancelDualAmericano(req.params.id, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Dual Americano cancelled', data: cancelled });
};

export const complete = async (req: Request, res: Response) => {
  const done = await service.completeDualAmericano(req.params.id, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'Dual Americano completed', data: done });
};

export const getMatchScore = async (req: Request, res: Response) => {
  const data = await service.getMatchScore(
    req.params.id,
    Number(req.params.roundNumber),
    req.params.matchId,
  );
  return sendResponse(res, { statusCode: 200, success: true, message: 'Match score', data });
};

// ─────────────────────────────────────────────────────────────────────────────
// MATCH DATE ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

export const assignMatchDateTime = async (req: Request, res: Response) => {
  const { matchDateTime } = req.body;
  const updated = await service.assignMatchDateTime(
    req.params.id,
    Number(req.params.roundNumber),
    req.params.matchId,
    matchDateTime,
    req.user._id.toString(),
  );
  return sendResponse(res, { statusCode: 200, success: true, message: 'Match date assigned', data: updated });
};

// ─────────────────────────────────────────────────────────────────────────────
// PER-MATCH CHAT
// ─────────────────────────────────────────────────────────────────────────────

export const createOrGetMatchChat = async (req: Request, res: Response) => {
  const chat = await service.createOrGetMatchChat(
    req.params.id,
    Number(req.params.roundNumber),
    req.params.matchId,
    req.user._id.toString(),
  );
  return sendResponse(res, { statusCode: 200, success: true, message: 'Chat ready', data: chat });
};

export const sendMatchChatMessage = async (req: Request, res: Response) => {
  const { message } = req.body;
  const msg = await service.sendMatchChatMessage(
    req.params.id,
    req.params.chatId,
    message,
    req.user._id.toString(),
  );
  return sendResponse(res, { statusCode: 200, success: true, message: 'Message sent', data: msg });
};

export const getMatchChat = async (req: Request, res: Response) => {
  const chat = await service.getMatchChat(
    req.params.id,
    req.params.chatId,
    req.user._id.toString(),
  );
  return sendResponse(res, { statusCode: 200, success: true, message: 'Chat retrieved', data: chat });
};

export const getMyDualAmericanoChats = async (req: Request, res: Response) => {
  const chats = await service.getMyDualAmericanoChats(req.params.id, req.user._id.toString());
  return sendResponse(res, { statusCode: 200, success: true, message: 'My chats', data: chats });
};
