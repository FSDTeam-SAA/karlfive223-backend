import { IMatch } from "../match/match.interface";
import Match from "../match/match.model";
import Standing from "./standing.model";

const POINTS = { WIN: 3, DRAW: 1, LOSS: 0 };

// --- PUBLIC: list standings for a league (ranked) ---
export const getStandingsByLeague = async (leagueId: string) => {
  return Standing.find({ league: leagueId })
    .populate("team", "teamName logoPhotoUrl")
    .populate("league", "leagueName leagueLogo")
    .sort({ position: 1, points: -1, goalDifference: -1, goalsFor: -1 });
};

// --- INTERNAL: recompute 1..N positions after any change ---
const recalcPositions = async (leagueId: string) => {
  const standings = await Standing.find({ league: leagueId }).sort({
    points: -1,
    goalDifference: -1,
    goalsFor: -1,
  });

  for (let i = 0; i < standings.length; i++) {
    const s = standings[i];
    if (s.position !== i + 1) {
      s.position = i + 1;
      await s.save();
    }
  }
};

// --- PUBLIC: apply a completed match result to both teams' standings ---
export const applyCompletedMatchToStandings = async (match: IMatch) => {
  const { teamOne, teamTwo, winnerTeam, league, matchScore, referee } = match;
  if (!league || !matchScore?.sets?.length) return;

  // ✅ Extract league ID properly (handle populated league object)
  const leagueId = typeof league === 'object' && (league as any)?._id 
    ? (league as any)._id.toString() 
    : league.toString();

  // ✅ NEW: Calculate winner by SET WINS (not total games)
  let t1SetsWon = 0;
  let t2SetsWon = 0;

  for (const set of matchScore.sets) {
    const teamOneGames = set.teamOneGames || 0;
    const teamTwoGames = set.teamTwoGames || 0;

    if (teamOneGames > teamTwoGames) {
      t1SetsWon += 1;
    } else if (teamTwoGames > teamOneGames) {
      t2SetsWon += 1;
    }
  }

  // Calculate total goals for standings tracking
  const t1Goals = matchScore.sets.reduce(
    (a, s) => a + (s.teamOneGames || 0),
    0
  );
  const t2Goals = matchScore.sets.reduce(
    (a, s) => a + (s.teamTwoGames || 0),
    0
  );

  const [s1, s2] = await Promise.all([
    Standing.findOneAndUpdate(
      { team: teamOne, league: leagueId },
      { $setOnInsert: { team: teamOne, league: leagueId, user: referee } },
      { new: true, upsert: true }
    ),
    Standing.findOneAndUpdate(
      { team: teamTwo, league: leagueId },
      { $setOnInsert: { team: teamTwo, league: leagueId, user: referee } },
      { new: true, upsert: true }
    ),
  ]);

  // played
  s1.played += 1;
  s2.played += 1;

  // goals (for reference/historical tracking)
  s1.goalsFor += t1Goals;
  s1.goalsAgainst += t2Goals;
  s2.goalsFor += t2Goals;
  s2.goalsAgainst += t1Goals;

  // ✅ Sets tracking
  s1.setsFor += t1SetsWon;
  s1.setsAgainst += t2SetsWon;
  s2.setsFor += t2SetsWon;
  s2.setsAgainst += t1SetsWon;

  // ✅ W/D/L & points based on SET WINS
  if (t1SetsWon === t2SetsWon) {
    // Draw in sets
    s1.drawn += 1;
    s2.drawn += 1;
    s1.points += POINTS.DRAW;
    s2.points += POINTS.DRAW;
  } else if (t1SetsWon > t2SetsWon) {
    // Team 1 won more sets
    s1.won += 1;
    s2.lost += 1;
    s1.points += POINTS.WIN;
  } else {
    // Team 2 won more sets
    s2.won += 1;
    s1.lost += 1;
    s2.points += POINTS.WIN;
  }

  s1.goalDifference = s1.goalsFor - s1.goalsAgainst;
  s2.goalDifference = s2.goalsFor - s2.goalsAgainst;
  s1.setDifference = s1.setsFor - s1.setsAgainst;
  s2.setDifference = s2.setsFor - s2.setsAgainst;

  await Promise.all([s1.save(), s2.save()]);
  await recalcPositions(leagueId);
};

export const rebuildLeagueStandingsForCompletedMatches = async (
  leagueId: string
) => {
  if (!leagueId) return;

  await Standing.deleteMany({ league: leagueId });

  const completedMatches = await Match.find({
    league: leagueId,
    matchStatus: "completed",
    "matchScore.sets.0": { $exists: true },
  })
    .sort({ matchDateTime: 1, createdAt: 1 })
    .select("teamOne teamTwo winnerTeam league matchScore referee");

  for (const match of completedMatches) {
    await applyCompletedMatchToStandings(match as unknown as IMatch);
  }

  await Match.updateMany({ league: leagueId }, { $set: { standingsApplied: false } });

  if (completedMatches.length) {
    await Match.updateMany(
      { _id: { $in: completedMatches.map((m) => m._id) } },
      { $set: { standingsApplied: true } }
    );
  }
};

// --- Optional admin helpers (list, get, update, delete) ---
export const listStandings = async (
  where: any,
  sort = { position: 1 as const }
) =>
  Standing.find(where)
    .populate("team", "teamName logoPhotoUrl")
    .populate("league", "leagueName leagueLogo")
    .sort(sort);

export const getStanding = (id: string) =>
  Standing.findById(id)
    .populate("team", "teamName logoPhotoUrl")
    .populate("league", "leagueName leagueLogo");

export const updateStandingManual = (
  id: string,
  payload: Partial<typeof Standing>
) => Standing.findByIdAndUpdate(id, payload, { new: true });

export const deleteStanding = (id: string) => Standing.findByIdAndDelete(id);
