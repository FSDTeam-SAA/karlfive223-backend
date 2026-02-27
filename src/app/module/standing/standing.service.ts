import { IMatch } from "../match/match.interface";
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

  // goals
  s1.goalsFor += t1Goals;
  s1.goalsAgainst += t2Goals;
  s2.goalsFor += t2Goals;
  s2.goalsAgainst += t1Goals;

  // W/D/L & points
  if (t1Goals === t2Goals) {
    s1.drawn += 1;
    s2.drawn += 1;
    s1.points += POINTS.DRAW;
    s2.points += POINTS.DRAW;
  } else if (winnerTeam && winnerTeam.toString() === teamOne.toString()) {
    s1.won += 1;
    s2.lost += 1;
    s1.points += POINTS.WIN;
  } else {
    s2.won += 1;
    s1.lost += 1;
    s2.points += POINTS.WIN;
  }

  s1.goalDifference = s1.goalsFor - s1.goalsAgainst;
  s2.goalDifference = s2.goalsFor - s2.goalsAgainst;

  await Promise.all([s1.save(), s2.save()]);
  await recalcPositions(leagueId);
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
