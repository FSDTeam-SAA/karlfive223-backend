import { Types } from "mongoose";
import AmericanoLeague from "../americano/americanoLeague.model";
import DualAmericano from "../dualAmericano/dualAmericano.model";
import League from "../league/league.model";
import Team from "../team/team.model";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 50;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

type LeagueKind =
  | "league"
  | "single_americano"
  | "dual_americano"
  | "free_americano";

type LeagueResult = {
  id: string;
  name: string;
  kind: LeagueKind;
  leagueType?: string;
  logo?: string;
  location?: string;
};

type TeamResult = {
  id: string;
  name: string;
  kind: LeagueKind;
  logo?: string;
  leagueId: string;
  leagueName: string;
};

type PlayerResult = {
  name: string;
  kind: LeagueKind;
  image?: string;
  /** Absent for a Single Americano player: they have no team to open. */
  teamId?: string;
  teamName?: string;
  leagueId: string;
  leagueName: string;
};

const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Searches what the signed-in user may see:
 * - public leagues, and private ones they own or have a team in
 * - teams and players in those leagues
 * - Americano events they created or joined
 * - free one-day Americanos they created (these are private to their creator)
 *
 * Private leagues and Americanos are joined by a code, so they stay hidden
 * from everyone else. Codes, emails and phone numbers are never returned.
 */
const search = async (
  userId: string,
  rawQuery: string,
  rawLimit?: number
): Promise<{
  query: string;
  leagues: LeagueResult[];
  teams: TeamResult[];
  players: PlayerResult[];
}> => {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (query.length < MIN_QUERY_LENGTH) {
    return { query, leagues: [], teams: [], players: [] };
  }

  const limit = Math.min(
    Number.isInteger(rawLimit) && rawLimit! > 0 ? rawLimit! : DEFAULT_LIMIT,
    MAX_LIMIT
  );
  const pattern = new RegExp(escapeRegex(query), "i");
  const uid = new Types.ObjectId(userId);

  const myTeams = await Team.find({
    $or: [{ user: uid }, { player: uid }],
    applicationStatus: { $ne: "rejected" },
  }).select("_id");

  const visibleLeagues = {
    $or: [
      { leagueType: "public" },
      { user: uid },
      { addTeams: { $in: myTeams.map((team) => team._id) } },
    ],
  };

  const [normalLeagues, teams, singleLeagues, dualEvents] = await Promise.all([
    League.find({
      $and: [
        visibleLeagues,
        { $or: [{ leagueName: pattern }, { location: pattern }] },
      ],
    })
      .select("leagueName leagueLogo leagueType location")
      .sort({ startDate: -1 })
      .limit(limit)
      .lean(),
    League.find(visibleLeagues)
      .distinct("_id")
      .then((leagueIds) =>
        Team.find({
          league: { $in: leagueIds },
          applicationStatus: { $ne: "rejected" },
          $or: [
            { teamName: pattern },
            { captainName: pattern },
            { partnerName: pattern },
          ],
        })
          .select("teamName captainName partnerName logoPhotoUrl league")
          .populate("league", "leagueName")
          .limit(MAX_LIMIT * 3)
          .lean()
      ),
    AmericanoLeague.find({
      $or: [
        { eventType: "free", user: uid },
        {
          eventType: { $ne: "free" },
          $or: [{ user: uid }, { players: uid }],
        },
      ],
    })
      .select("leagueName leagueLogo location players eventType")
      .populate("players", "name profileImage")
      .lean(),
    DualAmericano.find({
      isDeleted: false,
      status: { $ne: "cancelled" },
      $or: [
        { createdBy: uid },
        { registeredPlayers: uid },
        { "registeredPairs.player1": uid },
        { "registeredPairs.player2": uid },
      ],
    })
      .select("name registeredPairs")
      .lean(),
  ]);

  const leagues: LeagueResult[] = normalLeagues.map((league) => ({
    id: String(league._id),
    name: league.leagueName,
    kind: "league",
    leagueType: league.leagueType,
    logo: league.leagueLogo,
    location: league.location,
  }));
  const teamResults: TeamResult[] = [];
  const players: PlayerResult[] = [];

  for (const team of teams as any[]) {
    // A team whose league was deleted has nothing left to open.
    if (!team.league) continue;
    const leagueId = String(team.league._id);
    const leagueName = team.league.leagueName;

    if (pattern.test(team.teamName ?? "")) {
      teamResults.push({
        id: String(team._id),
        name: team.teamName,
        kind: "league",
        logo: team.logoPhotoUrl,
        leagueId,
        leagueName,
      });
    }
    for (const name of [team.captainName, team.partnerName]) {
      if (name && pattern.test(name)) {
        players.push({
          name,
          kind: "league",
          image: team.logoPhotoUrl,
          teamId: String(team._id),
          teamName: team.teamName,
          leagueId,
          leagueName,
        });
      }
    }
  }

  for (const league of singleLeagues as any[]) {
    const leagueId = String(league._id);
    const kind: LeagueKind =
      league.eventType === "free" ? "free_americano" : "single_americano";
    if (
      pattern.test(league.leagueName) ||
      pattern.test(league.location ?? "")
    ) {
      leagues.push({
        id: leagueId,
        name: league.leagueName,
        kind,
        logo: league.leagueLogo,
        location: league.location,
      });
    }
    for (const player of league.players ?? []) {
      if (player?.name && pattern.test(player.name)) {
        players.push({
          name: player.name,
          kind,
          image: player.profileImage ?? undefined,
          leagueId,
          leagueName: league.leagueName,
        });
      }
    }
  }

  for (const event of dualEvents as any[]) {
    const leagueId = String(event._id);
    if (pattern.test(event.name)) {
      leagues.push({ id: leagueId, name: event.name, kind: "dual_americano" });
    }
    // A pair's name holds both players' names unless it was given its own.
    for (const pair of event.registeredPairs ?? []) {
      if (pair.pairName && pattern.test(pair.pairName)) {
        teamResults.push({
          id: String(pair._id),
          name: pair.pairName,
          kind: "dual_americano",
          leagueId,
          leagueName: event.name,
        });
      }
    }
  }

  const bestFirst = <T extends { name: string }>(results: T[]) => {
    const lowerQuery = query.toLowerCase();
    const rank = (result: T) =>
      result.name.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
    return [...results]
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
      .slice(0, limit);
  };

  return {
    query,
    leagues: bestFirst(leagues),
    teams: bestFirst(teamResults),
    players: bestFirst(players),
  };
};

export const homeService = { search };
