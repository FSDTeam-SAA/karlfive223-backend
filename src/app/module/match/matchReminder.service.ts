import { createAndSendNotifications } from "../../helper/socketHelper";
import AmericanoMatch from "../americano/americanoMatch.model";
import DualAmericano from "../dualAmericano/dualAmericano.model";
import { NotificationEntityType } from "../notification/notifications.interface";
import Match from "./match.model";

const HOUR_MS = 60 * 60 * 1000;

/** How long before a match its players are reminded. */
export const REMINDER_BEFORE_MATCH_MS = 24 * HOUR_MS;

type DueMatch = {
  playerIds: string[];
  sideOne: string;
  sideTwo: string;
  startsAt: Date;
  entityType: NotificationEntityType;
  leagueId: string;
};

const isSameDate = (a?: Date | null, b?: Date | null) =>
  !!a && !!b && new Date(a).getTime() === new Date(b).getTime();

const ids = (...values: unknown[]) =>
  values.filter(Boolean).map((value) => String(value));

// The server's clock isn't the player's, so this says how long, not what time.
const timeUntil = (startsAt: Date, now: Date) => {
  const hours = Math.round((startsAt.getTime() - now.getTime()) / HOUR_MS);
  if (hours < 1) return "in less than an hour";
  return `in about ${hours} ${hours === 1 ? "hour" : "hours"}`;
};

// Each finder claims a match before returning it, so overlapping runs never
// remind twice. A claim that loses the race is simply skipped.
const claimNormalMatches = async (now: Date, until: Date) => {
  const matches: any[] = await Match.find({
    matchStatus: "upcoming",
    matchDateTime: { $gt: now, $lte: until },
  })
    .select("teamOne teamTwo league matchDateTime reminderSentFor")
    .populate("teamOne teamTwo", "teamName user player")
    .lean();

  const due: DueMatch[] = [];
  for (const match of matches) {
    if (isSameDate(match.reminderSentFor, match.matchDateTime)) continue;
    if (!match.teamOne || !match.teamTwo) continue;

    const claimed = await Match.updateOne(
      { _id: match._id, reminderSentFor: match.reminderSentFor ?? null },
      { $set: { reminderSentFor: match.matchDateTime } }
    );
    if (claimed.modifiedCount !== 1) continue;

    due.push({
      playerIds: ids(
        match.teamOne.user,
        match.teamOne.player,
        match.teamTwo.user,
        match.teamTwo.player
      ),
      sideOne: match.teamOne.teamName,
      sideTwo: match.teamTwo.teamName,
      startsAt: match.matchDateTime,
      entityType: "normalLeague",
      leagueId: String(match.league),
    });
  }
  return due;
};

const claimSingleAmericanoMatches = async (now: Date, until: Date) => {
  const matches: any[] = await AmericanoMatch.find({
    matchStatus: "upcoming",
    matchDateTime: { $gt: now, $lte: until },
  })
    .select(
      "league playerOne playerTwo playerOnePartner playerTwoPartner matchDateTime reminderSentFor"
    )
    .populate("league", "eventType")
    .populate("playerOne playerTwo playerOnePartner playerTwoPartner", "name")
    .lean();

  const sideName = (player: any, partner: any) =>
    partner ? `${player?.name} & ${partner.name}` : player?.name;

  const due: DueMatch[] = [];
  for (const match of matches) {
    // A free one-day Americano is run by its creator on the day, not played
    // to a schedule, so its players have no reminders.
    if (!match.league || match.league.eventType === "free") continue;
    if (isSameDate(match.reminderSentFor, match.matchDateTime)) continue;

    const claimed = await AmericanoMatch.updateOne(
      { _id: match._id, reminderSentFor: match.reminderSentFor ?? null },
      { $set: { reminderSentFor: match.matchDateTime } }
    );
    if (claimed.modifiedCount !== 1) continue;

    due.push({
      playerIds: ids(
        match.playerOne?._id,
        match.playerTwo?._id,
        match.playerOnePartner?._id,
        match.playerTwoPartner?._id
      ),
      sideOne: sideName(match.playerOne, match.playerOnePartner),
      sideTwo: sideName(match.playerTwo, match.playerTwoPartner),
      startsAt: match.matchDateTime,
      entityType: "americanoLeague",
      leagueId: String(match.league._id),
    });
  }
  return due;
};

const claimDualAmericanoMatches = async (now: Date, until: Date) => {
  const events: any[] = await DualAmericano.find({
    isDeleted: false,
    status: { $nin: ["completed", "cancelled"] },
    "rounds.matches.matchDateTime": { $gt: now, $lte: until },
  })
    .select("rounds registeredPairs")
    .lean();

  const due: DueMatch[] = [];
  for (const event of events) {
    const pairs = new Map<string, any>(
      event.registeredPairs.map((pair: any) => [String(pair._id), pair])
    );

    for (const round of event.rounds) {
      for (const match of round.matches) {
        const startsAt = match.matchDateTime;
        if (!startsAt || startsAt <= now || startsAt > until) continue;
        if (match.status === "completed") continue;
        if (isSameDate(match.reminderSentFor, startsAt)) continue;

        const pairOne = pairs.get(String(match.pair1));
        const pairTwo = pairs.get(String(match.pair2));
        if (!pairOne || !pairTwo) continue;

        const claimed = await DualAmericano.updateOne(
          { _id: event._id },
          { $set: { "rounds.$[round].matches.$[match].reminderSentFor": startsAt } },
          {
            arrayFilters: [
              { "round._id": round._id },
              {
                "match._id": match._id,
                "match.reminderSentFor": match.reminderSentFor ?? null,
              },
            ],
          }
        );
        if (claimed.modifiedCount !== 1) continue;

        due.push({
          playerIds: ids(
            pairOne.player1,
            pairOne.player2,
            pairTwo.player1,
            pairTwo.player2
          ),
          sideOne: pairOne.pairName ?? "Pair 1",
          sideTwo: pairTwo.pairName ?? "Pair 2",
          startsAt,
          entityType: "dualAmericanoEvent",
          leagueId: String(event._id),
        });
      }
    }
  }
  return due;
};

/**
 * Tells players their match is coming up, once for each date it's set to.
 * Fixtures often share the league's start date, so a player gets one message
 * per run about their soonest match rather than one per fixture.
 *
 * Returns how many players were notified.
 */
const sendMatchReminders = async (now = new Date()) => {
  const until = new Date(now.getTime() + REMINDER_BEFORE_MATCH_MS);

  const [normal, single, dual] = await Promise.all([
    claimNormalMatches(now, until),
    claimSingleAmericanoMatches(now, until),
    claimDualAmericanoMatches(now, until),
  ]);

  const matchesByPlayer = new Map<string, DueMatch[]>();
  for (const match of [...normal, ...single, ...dual]) {
    for (const playerId of new Set(match.playerIds)) {
      matchesByPlayer.set(playerId, [
        ...(matchesByPlayer.get(playerId) ?? []),
        match,
      ]);
    }
  }

  const playersByMessage = new Map<
    string,
    { message: string; soonest: DueMatch; playerIds: string[] }
  >();
  for (const [playerId, matches] of matchesByPlayer) {
    const [soonest, ...others] = [...matches].sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
    );
    const moreCount = others.length;
    const message =
      `${soonest.sideOne} vs ${soonest.sideTwo} starts ` +
      `${timeUntil(soonest.startsAt, now)}.` +
      (moreCount > 0
        ? ` You have ${moreCount} more ${moreCount === 1 ? "match" : "matches"} soon after.`
        : "");

    const key = `${soonest.leagueId}|${message}`;
    const group = playersByMessage.get(key);
    if (group) group.playerIds.push(playerId);
    else playersByMessage.set(key, { message, soonest, playerIds: [playerId] });
  }

  for (const { message, soonest, playerIds } of playersByMessage.values()) {
    await createAndSendNotifications(
      playerIds,
      "Match reminder",
      message,
      "match",
      { entityType: soonest.entityType, relatedId: soonest.leagueId }
    );
  }

  return matchesByPlayer.size;
};

export const matchReminderService = { sendMatchReminders };
