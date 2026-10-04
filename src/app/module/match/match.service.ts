import AppError from "../../error/appError";
import pagenation from "../../helper/pagenation";
import { createAndSendNotifications } from "../../helper/socketHelper";
import { IOption } from "../../interface";
import League from "../league/league.model";
import { rebuildLeagueStandingsForCompletedMatches } from "../standing/standing.service";
import Team from "../team/team.model";
import { IMatch } from "./match.interface";
import Match from "./match.model";

const ensureLeagueOwnerCanManageMatch = async (
  leagueId: any,
  currentUserId?: string
) => {
  if (!currentUserId) {
    throw new AppError(401, "Only league owner can manage this match.");
  }
  const league = await League.findById(leagueId).select("user");
  if (!league) {
    throw new AppError(404, "League not found.");
  }

  if (league.user.toString() !== currentUserId.toString()) {
    throw new AppError(403, "Only league owner can manage this match.");
  }
};

const getLeagueId = (league: any) => {
  if (!league) return "";
  return typeof league === "object" && league?._id
    ? league._id.toString()
    : league.toString();
};

// --- Create match ---
const createMatch = async (payload: IMatch, currentUserId?: string) => {
  if (!payload.teamOne || !payload.teamTwo) {
    throw new AppError(400, "Both teams are required.");
  }
  if (payload.teamOne.toString() === payload.teamTwo.toString()) {
    throw new AppError(400, "Team One and Team Two cannot be the same.");
  }

  const [t1, t2] = await Promise.all([
    Team.findById(payload.teamOne),
    Team.findById(payload.teamTwo),
  ]);
  if (!t1 || !t2) throw new AppError(404, "One or both teams not found.");
  if (t1.league.toString() !== t2.league.toString()) {
    throw new AppError(400, "Both teams must belong to the same league.");
  }
  if (payload.league && payload.league.toString() !== t1.league.toString()) {
    throw new AppError(400, "Match league must match the teams' league.");
  }
  payload.league = t1.league; // normalize

  if (payload.courtNumber !== undefined) {
    await ensureLeagueOwnerCanManageMatch(payload.league, currentUserId);
  }

  const match = await Match.create(payload);

  if (match.matchStatus === "completed") {
    const leagueId = getLeagueId(match.league);
    if (leagueId) {
      await rebuildLeagueStandingsForCompletedMatches(leagueId);
      match.standingsApplied = true;
      await match.save();
    }
  }

  return match.populate("teamOne teamTwo league matchVenue referee winnerTeam");
};

// --- Update match ---
const updateMatch = async (
  id: string,
  payload: Partial<IMatch>,
  currentUserId?: string
) => {
  const match = await Match.findById(id);
  if (!match) return null;

  const oldMatchStatus = match.matchStatus;
  const scoreChanged = payload.matchScore !== undefined;

  // Store old match date to detect changes
  const oldMatchDateTime = match.matchDateTime;
  const dateChanged = payload.matchDateTime && 
    oldMatchDateTime && 
    new Date(payload.matchDateTime).getTime() !== new Date(oldMatchDateTime).getTime();

  // Keep league/team consistency if any of these fields are being changed
  if (payload.teamOne || payload.teamTwo) {
    const t1 = await Team.findById(payload.teamOne ?? match.teamOne);
    const t2 = await Team.findById(payload.teamTwo ?? match.teamTwo);
    if (!t1 || !t2) throw new AppError(404, "One or both teams not found.");
    if (t1.league.toString() !== t2.league.toString()) {
      throw new AppError(400, "Both teams must belong to the same league.");
    }
    payload.league = t1.league;
  }

  if (payload.courtNumber !== undefined) {
    const leagueId = payload.league ?? match.league;
    await ensureLeagueOwnerCanManageMatch(leagueId, currentUserId);
  }

  Object.assign(match, payload);
  await match.save();

  // Populate match details for notifications
  await match.populate("teamOne teamTwo league");

  // If match date changed, notify all users in both teams
  if (dateChanged) {
    const teamOne = match.teamOne as any;
    const teamTwo = match.teamTwo as any;
    const league = match.league as any;

    // Get all user IDs from both teams
    const userIds = [
      teamOne?.user,
      teamOne?.player,
      teamTwo?.user,
      teamTwo?.player,
    ].filter(Boolean);

    const newDate = new Date(match.matchDateTime!);
    
    // Use UTC methods to avoid ANY timezone conversion
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    
    const month = monthNames[newDate.getUTCMonth()];
    const day = newDate.getUTCDate();
    const year = newDate.getUTCFullYear();
    
    let hours = newDate.getUTCHours();
    const minutes = newDate.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    const formattedDate = `${month} ${day}, ${year}, ${formattedTime}`;

    const message = `📅 Match date updated: ${teamOne.teamName} vs ${teamTwo.teamName} in ${league.leagueName} has been rescheduled to ${formattedDate}`;
    // Create notifications in DB, send via Socket.IO, and push.
    await createAndSendNotifications(
      userIds,
      "Match Rescheduled",
      message,
      "match",
      { entityType: "normalLeague", relatedId: league._id }
    );
  }

  // Only apply once
  if (match.matchStatus === "completed") {
    // ✅ NEW: Calculate winner by SET WINS (not total games)
    if (scoreChanged && payload.winnerTeam === undefined && match.matchScore) {
      let t1SetsWon = 0;
      let t2SetsWon = 0;

      for (const set of match.matchScore.sets) {
        const teamOneGames = set.teamOneGames || 0;
        const teamTwoGames = set.teamTwoGames || 0;

        if (teamOneGames > teamTwoGames) {
          t1SetsWon += 1;
        } else if (teamTwoGames > teamOneGames) {
          t2SetsWon += 1;
        }
      }

      if (t1SetsWon === t2SetsWon) {
        // Draw
        match.winnerTeam = null;
      } else if (t1SetsWon > t2SetsWon) {
        match.winnerTeam = match.teamOne as any;
      } else {
        match.winnerTeam = match.teamTwo as any;
      }
      await match.save();
    }

    const teamOne = match.teamOne as any;
    const teamTwo = match.teamTwo as any;
    const league = match.league as any;
    const leagueName = league?.leagueName || "League";

    // Calculate total games for notification message
    const t1Goals = match.matchScore?.sets.reduce((a, s) => a + (s.teamOneGames || 0), 0) || 0;
    const t2Goals = match.matchScore?.sets.reduce((a, s) => a + (s.teamTwoGames || 0), 0) || 0;

    // Check if it's a draw (winnerTeam is null)
    const isDraw = match.winnerTeam === null;

    if (isDraw) {
      // Send draw notifications to all players in both teams
      const allUserIds = [
        teamOne?.user,
        teamOne?.player,
        teamTwo?.user,
        teamTwo?.player,
      ].filter(Boolean);

      const message = `🤝 Match ended in a draw: ${teamOne.teamName} vs ${teamTwo.teamName} in ${leagueName} (${t1Goals}-${t2Goals})`;

      if (allUserIds.length) {
        const uniqueIds = [...new Set(allUserIds.map((id) => id.toString()))];
        await createAndSendNotifications(uniqueIds, "Match Draw", message, "match", {
          entityType: "normalLeague",
          relatedId: league._id,
        });
      }
    } else if (match.winnerTeam) {
      // Send winner notifications
      const winnerTeam = match.winnerTeam.toString() === match.teamOne.toString() ? teamOne : teamTwo;
      const loserTeam = match.winnerTeam.toString() === match.teamOne.toString() ? teamTwo : teamOne;

      // ✅ pick recipients (winner team players)
      const winnerUserIds = [winnerTeam?.user, winnerTeam?.player].filter(Boolean);

      // message
      const message = `🏆 ${winnerTeam.teamName} won vs ${loserTeam.teamName} in ${leagueName}!`;

      // bulk insert notifications (fast)
      if (winnerUserIds.length) {
        const uniqueIds = [...new Set(winnerUserIds.map((id) => id.toString()))];
        await createAndSendNotifications(uniqueIds, "Match Won! 🏆", message, "success", {
          entityType: "normalLeague",
          relatedId: league._id,
        });
      }
    }

  }

  // Rebuild standings whenever a completed match is edited or status changes to/from completed.
  if (oldMatchStatus === "completed" || match.matchStatus === "completed") {
    const leagueId = getLeagueId(match.league);
    if (leagueId) {
      await rebuildLeagueStandingsForCompletedMatches(leagueId);
      match.standingsApplied = match.matchStatus === "completed";
      await match.save();
    }
  }

  return match.populate("teamOne teamTwo league matchVenue referee winnerTeam");
};

const editCompletedMatchScore = async (
  id: string,
  payload: Pick<IMatch, "matchScore" | "winnerTeam">,
  currentUserId?: string
) => {
  const existingMatch = await Match.findById(id);
  if (!existingMatch) return null;

  if (existingMatch.matchStatus !== "completed") {
    throw new AppError(
      400,
      "Only completed match scores can be corrected from this endpoint."
    );
  }

  const editsUsed = existingMatch.scoreEditCount || 0;
  if (editsUsed >= 2) {
    throw new AppError(
      400,
      "This match's score has already been corrected the maximum number of times (2)."
    );
  }

  await ensureLeagueOwnerCanManageMatch(existingMatch.league, currentUserId);

  const updatePayload: Partial<IMatch> = {
    matchStatus: "completed",
    matchScore: payload.matchScore,
    scoreEditCount: editsUsed + 1,
  };

  if (payload.winnerTeam !== undefined) {
    updatePayload.winnerTeam = payload.winnerTeam;
  }

  return updateMatch(id, updatePayload, currentUserId);
};

// --- Reschedule a match's date/time ---
// Unlike courtNumber (league-owner only, via ensureLeagueOwnerCanManageMatch),
// the date is something the two teams actually playing the match need to be
// able to agree on between themselves — so this allows either the league
// owner *or* any of the four people on the two teams in this specific match,
// and nobody else in the league.
const rescheduleMatch = async (
  id: string,
  matchDateTime: string,
  currentUserId?: string
) => {
  const match = await Match.findById(id).populate("teamOne teamTwo league");
  if (!match) return null;

  if (!currentUserId) {
    throw new AppError(401, "Authentication required to reschedule this match.");
  }

  const league = match.league as any;
  const teamOne = match.teamOne as any;
  const teamTwo = match.teamTwo as any;

  const isOrganizer = league?.user?.toString() === currentUserId.toString();
  const matchPlayerIds = [teamOne?.user, teamOne?.player, teamTwo?.user, teamTwo?.player]
    .filter(Boolean)
    .map((v: any) => v.toString());
  const isMatchPlayer = matchPlayerIds.includes(currentUserId.toString());

  if (!isOrganizer && !isMatchPlayer) {
    throw new AppError(
      403,
      "Only the players in this match or the league owner can change its date."
    );
  }

  const oldDateTime = match.matchDateTime;
  const newDateTime = new Date(matchDateTime);
  const dateChanged =
    !oldDateTime || new Date(oldDateTime).getTime() !== newDateTime.getTime();

  match.matchDateTime = newDateTime as any;
  await match.save();

  if (dateChanged) {
    const userIds = [teamOne?.user, teamOne?.player, teamTwo?.user, teamTwo?.player].filter(
      Boolean
    );
    const leagueName = league?.leagueName || "League";

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const d = newDateTime;
    const month = monthNames[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    let hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const formattedDate = `${month} ${day}, ${year}, ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")} ${ampm}`;

    const message = `📅 Match date updated: ${teamOne.teamName} vs ${teamTwo.teamName} in ${leagueName} has been rescheduled to ${formattedDate}`;
    await createAndSendNotifications(userIds, "Match Rescheduled", message, "match", {
      entityType: "normalLeague",
      relatedId: league._id,
    });
  }

  return match.populate("teamOne teamTwo league matchVenue referee winnerTeam");
};

// --- Queries ---
const getAllMatches = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];
  const searchable = ["matchStatus"];

  if (searchTerm) {
    andCondition.push({
      $or: searchable.map((f) => ({ [f]: { $regex: searchTerm, $options: "i" } })),
    });
  }
  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([k, v]) => ({ [k]: v })),
    });
  }

  const where = andCondition.length ? { $and: andCondition } : {};

  const data = await Match.find(where)
    .populate("teamOne teamTwo league matchVenue referee winnerTeam")
    //  .sort({ [sortBy || "createdAt"]: sortOrder || "asc" } as any)
    .skip(skip)
    .limit(limit);

  const total = await Match.countDocuments(where);
  return { data, meta: { total, page, limit } };
};

const getSingleMatch = (id: string) =>
  Match.findById(id).populate("teamOne teamTwo league matchVenue referee winnerTeam");

const deleteMatch = (id: string) => Match.findByIdAndDelete(id);

// --- Get Player's Next Matches by User ID ---
const getPlayerNextMatches = async (userId: string) => {
  // Find all teams where the user is either the user or player
  const teams = await Team.find({
    $or: [{ user: userId }, { player: userId }],
  });

  if (!teams || teams.length === 0) {
    return { nextMatch: null, upcomingMatches: [] };
  }

  const teamIds = teams.map((team) => team._id);

  // Get today's date at start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find matches where user's teams are playing and match is not completed
  const matches = await Match.find({
    $or: [{ teamOne: { $in: teamIds } }, { teamTwo: { $in: teamIds } }],
    matchStatus: { $ne: "completed" },
  })
    .populate("teamOne teamTwo league matchVenue referee winnerTeam")
    .sort({ matchDateTime: 1 });

  // Find today's incomplete matches (next match)
  const todayMatches = matches.filter((match) => {
    if (!match.matchDateTime) return false;
    const matchDate = new Date(match.matchDateTime);
    matchDate.setHours(0, 0, 0, 0);
    return matchDate.getTime() >= today.getTime();
  });

  const nextMatch = todayMatches.length > 0 ? todayMatches[0] : null;

  return { nextMatch, upcomingMatches: todayMatches };
};

// --- Get Team Fixtures by Team ID and League ID ---
const getTeamFixturesByLeague = async (teamId: string, leagueId: string) => {
  // Verify team exists
  const team = await Team.findById(teamId);
  if (!team) {
    throw new AppError(404, "Team not found");
  }

  // Find all matches where the team is playing in the specified league
  const fixtures = await Match.find({
    $or: [{ teamOne: teamId }, { teamTwo: teamId }],
    league: leagueId,
  })
    .populate("teamOne teamTwo league matchVenue referee winnerTeam")
    .sort({ matchDateTime: 1 }); // Sort by match date ascending

  return fixtures;
};

export default {
  createMatch,
  editCompletedMatchScore,
  updateMatch,
  rescheduleMatch,
  getAllMatches,
  getSingleMatch,
  deleteMatch,
  getPlayerNextMatches,
  getTeamFixturesByLeague
};
