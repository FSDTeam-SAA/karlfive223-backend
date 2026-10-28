import mongoose from "mongoose";
import AppError from "../../error/appError";
import { createAndSendNotifications } from "../../helper/socketHelper";
import { americanoService } from "../americano/americano.service";
import AmericanoLeague from "../americano/americanoLeague.model";
import { IAmericanoMatch } from "../americano/americanoMatch.interface";
import AmericanoMatch from "../americano/americanoMatch.model";
import AmericanoStanding from "../americano/americanoStanding.model";
import { Notification } from "../notification/notification.model";
import AmericanoGuestPlayer from "./americanoGuestPlayer.model";
import { generateFreeAmericanoRounds } from "./freeAmericano.pairing";

const FREE = "free";
// Matches are pair vs pair, so a match needs four players.
export const FREE_AMERICANO_MIN_PLAYERS = 4;
export const FREE_AMERICANO_MAX_PLAYERS = 24;
const MAX_NAME_LENGTH = 50;

const HOUR_MS = 60 * 60 * 1000;
// Results stay visible (read-only) for 24h after the last match is scored.
const KEEP_AFTER_COMPLETION_MS = 24 * HOUR_MS;
// An event that is never finished is removed 7 days after creation.
const UNFINISHED_LIFETIME_MS = 7 * 24 * HOUR_MS;
// The creator is reminded this long before deletion.
const REMINDER_BEFORE_DELETE_MS = 2 * HOUR_MS;

const guestPopulate = (path: string) => ({
  path,
  model: AmericanoGuestPlayer,
  select: "name",
});

const generateJoinOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const assertObjectId = (id: string, label: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(404, `${label} not found`);
  }
};

// Owner-only lookup: anyone else gets the same 404 as a missing event, so
// the event's existence is never revealed to other users.
const findOwnedEvent = async (eventId: string, userId: string) => {
  assertObjectId(eventId, "Americano");
  const league = await AmericanoLeague.findOne({
    _id: eventId,
    eventType: FREE,
    user: userId,
  });
  if (!league) throw new AppError(404, "Americano not found");
  return league;
};

const findOwnedMatch = async (matchId: string, userId: string) => {
  assertObjectId(matchId, "Match");
  const match = await AmericanoMatch.findById(matchId);
  if (!match) throw new AppError(404, "Match not found");

  const league = await AmericanoLeague.findOne({
    _id: match.league,
    eventType: FREE,
    user: userId,
  });
  if (!league) throw new AppError(404, "Match not found");

  return { match, league };
};

const assertEditable = (league: any) => {
  if (league.completedAt) {
    throw new AppError(
      400,
      "This Americano is complete. Results are read-only now."
    );
  }
};

const populatedEvent = (eventId: any) =>
  AmericanoLeague.findById(eventId)
    .populate("user", "name email")
    .populate(guestPopulate("players"));

const MATCH_PLAYER_PATHS = [
  "playerOne",
  "playerOnePartner",
  "playerTwo",
  "playerTwoPartner",
  "winnerPlayer",
];

const populateMatchPlayers = (query: any) =>
  MATCH_PLAYER_PATHS.reduce((q, path) => q.populate(guestPopulate(path)), query);

const populatedMatch = (matchId: any) =>
  populateMatchPlayers(AmericanoMatch.findById(matchId));

// Splits the players into rotating partner pairs, round by round, and
// creates the pair-vs-pair matches (see freeAmericano.pairing.ts).
const generatePairFixtures = async (league: any) => {
  const playerIds = league.players.map((player: any) => String(player));
  const rounds = generateFreeAmericanoRounds(playerIds);
  if (!rounds.length) {
    throw new AppError(
      400,
      `At least ${FREE_AMERICANO_MIN_PLAYERS} players are needed to create matches`
    );
  }

  const matchDateTime = league.startDate ? new Date(league.startDate) : new Date();
  await AmericanoMatch.insertMany(
    rounds.flatMap((round) =>
      round.matches.map((match) => ({
        league: league._id,
        playerOne: match.teamOne[0],
        playerOnePartner: match.teamOne[1],
        playerTwo: match.teamTwo[0],
        playerTwoPartner: match.teamTwo[1],
        roundNumber: round.roundNumber,
        matchDateTime,
        matchStatus: "upcoming",
      }))
    )
  );

  league.fixturesGenerated = true;
  await league.save();

  // Seeds one standings row per player.
  await americanoService.rebuildStandings(String(league._id));
};

const parsePlayerNames = (raw: unknown, maxPlayers: number) => {
  if (!Array.isArray(raw)) {
    throw new AppError(400, "playerNames must be a list of names");
  }

  const names = raw.map((name) => String(name ?? "").trim());

  if (names.length !== maxPlayers) {
    throw new AppError(400, `Please enter exactly ${maxPlayers} player names`);
  }
  if (names.some((name) => !name)) {
    throw new AppError(400, "Every player needs a name");
  }
  if (names.some((name) => name.length > MAX_NAME_LENGTH)) {
    throw new AppError(
      400,
      `Player names can be at most ${MAX_NAME_LENGTH} characters`
    );
  }

  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      throw new AppError(400, `"${name}" is entered more than once`);
    }
    seen.add(key);
  }

  return names;
};

const parseSets = (payload: any) => {
  const sets = payload?.matchScore?.sets;
  if (!Array.isArray(sets) || !sets.length) {
    throw new AppError(400, "matchScore.sets is required");
  }

  return sets.map((set: any) => {
    const playerOneGames = Number(set?.playerOneGames);
    const playerTwoGames = Number(set?.playerTwoGames);
    const valid = [playerOneGames, playerTwoGames].every(
      (games) => Number.isInteger(games) && games >= 0
    );
    if (!valid) {
      throw new AppError(400, "Games must be whole numbers of 0 or more");
    }
    return { playerOneGames, playerTwoGames };
  });
};

// Stamps completedAt exactly once, when the last match has a final score.
// The conditional update makes concurrent score submissions safe.
const markCompleteIfAllScored = async (leagueId: any) => {
  const remaining = await AmericanoMatch.countDocuments({
    league: leagueId,
    matchStatus: { $ne: "completed" },
  });
  if (remaining > 0) return;

  const completedAt = new Date();
  await AmericanoLeague.updateOne(
    { _id: leagueId, eventType: FREE, completedAt: null },
    {
      $set: {
        completedAt,
        deleteAt: new Date(completedAt.getTime() + KEEP_AFTER_COMPLETION_MS),
      },
    }
  );
};

const createEvent = async (userId: string, payload: any) => {
  const leagueName = String(payload?.leagueName ?? "").trim();
  if (!leagueName) throw new AppError(400, "Americano name is required");

  const maxPlayers = Number(payload?.maxPlayers);
  if (
    !Number.isInteger(maxPlayers) ||
    maxPlayers < FREE_AMERICANO_MIN_PLAYERS ||
    maxPlayers > FREE_AMERICANO_MAX_PLAYERS
  ) {
    throw new AppError(
      400,
      `Maximum players must be between ${FREE_AMERICANO_MIN_PLAYERS} and ${FREE_AMERICANO_MAX_PLAYERS}`
    );
  }

  const playerNames = parsePlayerNames(payload?.playerNames, maxPlayers);

  const active = await AmericanoLeague.exists({
    user: userId,
    eventType: FREE,
    completedAt: null,
  });
  if (active) {
    throw new AppError(
      400,
      "You already have a one-day Americano in progress. Finish it before creating a new one."
    );
  }

  const now = new Date();
  const league = await AmericanoLeague.create({
    user: userId,
    leagueName,
    joinOtp: generateJoinOtp(),
    description: "Free one-day Americano",
    location: "-",
    startDate: now,
    maxPlayers,
    players: [],
    fixturesGenerated: false,
    matchPlay: "Once",
    eventType: FREE,
    completedAt: null,
    deleteAt: new Date(now.getTime() + UNFINISHED_LIFETIME_MS),
    deletionReminderSent: false,
  });

  try {
    const guests = await AmericanoGuestPlayer.insertMany(
      playerNames.map((name) => ({ league: league._id, name }))
    );
    league.players = guests.map((guest) => guest._id) as any;
    await league.save();

    await generatePairFixtures(league);
  } catch (error) {
    await deleteEventData(league._id);
    throw error;
  }

  return populatedEvent(league._id);
};

const getMyEvents = async (userId: string) => {
  return AmericanoLeague.find({ user: userId, eventType: FREE })
    .populate("user", "name email")
    .populate(guestPopulate("players"))
    .sort({ createdAt: -1 });
};

const getEventById = async (eventId: string, userId: string) => {
  const league = await findOwnedEvent(eventId, userId);
  return populatedEvent(league._id);
};

const getEventMatches = async (eventId: string, userId: string) => {
  const league = await findOwnedEvent(eventId, userId);
  // _id last: matches in a round share their date, so keep a stable order.
  return populateMatchPlayers(AmericanoMatch.find({ league: league._id })).sort(
    { roundNumber: 1, matchDateTime: 1, createdAt: 1, _id: 1 }
  );
};

const getEventStandings = async (eventId: string, userId: string) => {
  const league = await findOwnedEvent(eventId, userId);
  return AmericanoStanding.find({ league: league._id })
    .populate(guestPopulate("player"))
    .sort({ position: 1, points: -1, setDifference: -1, goalDifference: -1 });
};

// Enters or corrects a match score. Corrections are allowed until every
// match is scored; from then on the event is read-only.
const submitMatchResult = async (
  matchId: string,
  payload: any,
  userId: string
) => {
  const { match, league } = await findOwnedMatch(matchId, userId);
  assertEditable(league);

  const sets = parseSets(payload);

  let p1SetsWon = 0;
  let p2SetsWon = 0;
  for (const set of sets) {
    if (set.playerOneGames > set.playerTwoGames) p1SetsWon += 1;
    else if (set.playerTwoGames > set.playerOneGames) p2SetsWon += 1;
  }

  match.matchScore = { sets } as IAmericanoMatch["matchScore"];
  match.matchStatus = "completed";
  // In a pair match winnerPlayer marks the winning side by its first player
  // (playerOne or playerTwo); their partner won too.
  if (p1SetsWon === p2SetsWon) match.winnerPlayer = null;
  else
    match.winnerPlayer = (
      p1SetsWon > p2SetsWon ? match.playerOne : match.playerTwo
    ) as any;

  await match.save();
  await americanoService.rebuildStandings(String(league._id));
  await markCompleteIfAllScored(league._id);

  return populatedMatch(match._id);
};

const assignCourtNumber = async (
  matchId: string,
  courtNumber: unknown,
  userId: string
) => {
  const { match, league } = await findOwnedMatch(matchId, userId);
  assertEditable(league);

  const court = Number(courtNumber);
  if (!Number.isInteger(court) || court < 1) {
    throw new AppError(400, "Valid court number is required");
  }

  match.courtNumber = court;
  await match.save();

  return populatedMatch(match._id);
};

// Removes an event and everything linked to it. Every step is a no-op when
// its data is already gone, and the league row is removed last, so a run
// that fails halfway is simply finished by the next one.
const deleteEventData = async (leagueId: any) => {
  const id = leagueId.toString();
  await AmericanoMatch.deleteMany({ league: id });
  await AmericanoStanding.deleteMany({ league: id });
  await AmericanoGuestPlayer.deleteMany({ league: id });
  await Notification.deleteMany({ entityType: "freeAmericano", relatedId: id });
  await AmericanoLeague.deleteOne({ _id: id, eventType: FREE });
};

const sendDeletionReminders = async (now = new Date()) => {
  const due = await AmericanoLeague.find({
    eventType: FREE,
    deletionReminderSent: false,
    deleteAt: {
      $gt: now,
      $lte: new Date(now.getTime() + REMINDER_BEFORE_DELETE_MS),
    },
  }).select("_id user leagueName completedAt");

  let sent = 0;
  for (const league of due) {
    // Claim the reminder first so overlapping runs never send it twice.
    const claimed = await AmericanoLeague.updateOne(
      { _id: league._id, deletionReminderSent: false },
      { $set: { deletionReminderSent: true } }
    );
    if (claimed.modifiedCount !== 1) continue;

    const message = league.completedAt
      ? `${league.leagueName} will be deleted in about 2 hours. Download the final ranking now if you want to keep it.`
      : `${league.leagueName} was never finished and will be deleted in about 2 hours.`;

    await createAndSendNotifications(
      [league.user.toString()],
      "One-day Americano ending soon",
      message,
      "warning",
      { entityType: "freeAmericano", relatedId: String(league._id) }
    );
    sent += 1;
  }
  return sent;
};

const deleteExpiredEvents = async (now = new Date()) => {
  const expired = await AmericanoLeague.find({
    eventType: FREE,
    deleteAt: { $lte: now },
  }).select("_id");

  let deleted = 0;
  for (const league of expired) {
    try {
      await deleteEventData(league._id);
      deleted += 1;
    } catch (err) {
      console.error(
        `❌ Free Americano: failed to delete ${league._id}:`,
        (err as any)?.message
      );
    }
  }
  return deleted;
};

export const freeAmericanoService = {
  createEvent,
  getMyEvents,
  getEventById,
  getEventMatches,
  getEventStandings,
  submitMatchResult,
  assignCourtNumber,
  sendDeletionReminders,
  deleteExpiredEvents,
};
