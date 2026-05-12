import mongoose from "mongoose";
import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import { Notification } from "../notification/notification.model";
import User from "../user/user.model";
import { IAmericanoLeague } from "./americanoLeague.interface";
import AmericanoLeague from "./americanoLeague.model";
import { IAmericanoMatch } from "./americanoMatch.interface";
import AmericanoMatch from "./americanoMatch.model";
import AmericanoStanding from "./americanoStanding.model";

const POINTS = { WIN: 3, DRAW: 1 };

const generateJoinOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const toObjectIdString = (value: any) =>
  value?._id?.toString?.() || value?.toString?.() || "";

const generateFixturesOrdered = (
  playerIdsInput: mongoose.Types.ObjectId[],
  legs = 1
) => {
  const players = [...playerIdsInput];

  if (players.length % 2 === 1) {
    players.push(null as any);
  }

  const n = players.length;
  const rounds = n - 1;
  const matchesPerRound = n / 2;

  const fixed = players[0];
  const originalRotating = players.slice(1);
  const fixtures: { playerOne: any; playerTwo: any }[] = [];

  for (let leg = 1; leg <= legs; leg++) {
    let rotating = [...originalRotating];

    for (let round = 1; round <= rounds; round++) {
      const current = [fixed, ...rotating];

      for (let i = 0; i < matchesPerRound; i++) {
        const p1 = current[i];
        const p2 = current[n - 1 - i];

        if (!p1 || !p2) continue;

        const flip = (round + leg) % 2 === 0;
        fixtures.push({
          playerOne: flip ? p2 : p1,
          playerTwo: flip ? p1 : p2,
        });
      }

      rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
    }
  }

  return fixtures;
};

const getLegCount = (matchPlay?: string) => {
  const normalized = String(matchPlay || "Once").toLowerCase();
  if (normalized === "twice") return 2;
  if (normalized === "thrice") return 3;
  return 1;
};

const recalcPositions = async (leagueId: string) => {
  const standings = await AmericanoStanding.find({ league: leagueId }).sort({
    points: -1,
    setDifference: -1,
    goalDifference: -1,
    goalsFor: -1,
  });

  let updateCount = 0;
  for (let i = 0; i < standings.length; i++) {
    const row = standings[i];
    if (row.position !== i + 1) {
      row.position = i + 1;
      await row.save();
      updateCount++;
    }
  }

  if (updateCount > 0) {
    console.log(`✅ Americano Positions Recalculated: ${updateCount} players repositioned in league ${leagueId}`);
  }
};

const seedStandings = async (
  leagueId: mongoose.Types.ObjectId,
  playerIds: mongoose.Types.ObjectId[]
) => {
  if (!playerIds.length) return;

  await AmericanoStanding.deleteMany({ league: leagueId });
  await AmericanoStanding.insertMany(
    playerIds.map((player) => ({
      league: leagueId,
      player,
    }))
  );
};

const applyCompletedMatchToStandings = async (match: IAmericanoMatch) => {
  const leagueId = toObjectIdString(match.league);
  if (!leagueId || !match.matchScore?.sets?.length) return;

  let p1SetsWon = 0;
  let p2SetsWon = 0;

  for (const set of match.matchScore.sets) {
    const p1Games = set.playerOneGames || 0;
    const p2Games = set.playerTwoGames || 0;

    if (p1Games > p2Games) p1SetsWon += 1;
    else if (p2Games > p1Games) p2SetsWon += 1;
  }

  const p1Goals = match.matchScore.sets.reduce(
    (acc, set) => acc + (set.playerOneGames || 0),
    0
  );
  const p2Goals = match.matchScore.sets.reduce(
    (acc, set) => acc + (set.playerTwoGames || 0),
    0
  );

  const [s1, s2] = await Promise.all([
    AmericanoStanding.findOneAndUpdate(
      { league: leagueId, player: match.playerOne },
      { $setOnInsert: { league: leagueId, player: match.playerOne } },
      { new: true, upsert: true }
    ),
    AmericanoStanding.findOneAndUpdate(
      { league: leagueId, player: match.playerTwo },
      { $setOnInsert: { league: leagueId, player: match.playerTwo } },
      { new: true, upsert: true }
    ),
  ]);

  s1.played += 1;
  s2.played += 1;

  s1.goalsFor += p1Goals;
  s1.goalsAgainst += p2Goals;
  s2.goalsFor += p2Goals;
  s2.goalsAgainst += p1Goals;

  s1.setsFor += p1SetsWon;
  s1.setsAgainst += p2SetsWon;
  s2.setsFor += p2SetsWon;
  s2.setsAgainst += p1SetsWon;

  if (p1SetsWon === p2SetsWon) {
    s1.drawn += 1;
    s2.drawn += 1;
    s1.points += POINTS.DRAW;
    s2.points += POINTS.DRAW;
  } else if (p1SetsWon > p2SetsWon) {
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
  s1.setDifference = s1.setsFor - s1.setsAgainst;
  s2.setDifference = s2.setsFor - s2.setsAgainst;

  await Promise.all([s1.save(), s2.save()]);
};

const rebuildStandings = async (leagueId: string) => {
  const league = await AmericanoLeague.findById(leagueId).select("players leagueName");
  if (!league) throw new AppError(404, "Americano league not found");

  const playerIds = (league.players || []).map(
    (player) => new mongoose.Types.ObjectId(toObjectIdString(player))
  );

  // ✅ Reseed standings for all players
  await seedStandings(new mongoose.Types.ObjectId(leagueId), playerIds);

  // ✅ Get all completed matches and apply their results
  const completedMatches = await AmericanoMatch.find({
    league: leagueId,
    matchStatus: "completed",
    "matchScore.sets.0": { $exists: true },
  })
    .sort({ matchDateTime: 1, createdAt: 1 })
    .select("league playerOne playerTwo matchScore");

  for (const match of completedMatches) {
    await applyCompletedMatchToStandings(match as IAmericanoMatch);
  }

  // ✅ Mark all matches as standings-applied
  await AmericanoMatch.updateMany(
    { league: leagueId },
    { $set: { standingsApplied: false } }
  );

  if (completedMatches.length > 0) {
    await AmericanoMatch.updateMany(
      { _id: { $in: completedMatches.map((match) => match._id) } },
      { $set: { standingsApplied: true } }
    );
    console.log(`✅ Americano Standings Rebuilt: ${completedMatches.length} matches applied for league: ${league.leagueName}`);
  }

  // ✅ Recalculate positions
  await recalcPositions(leagueId);
};

const createLeague = async (
  email: string,
  payload: Partial<IAmericanoLeague>,
  files: { logo?: Express.Multer.File; banner?: Express.Multer.File }
) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");

  if (files.logo) {
    const uploadLogo = await fileUploader.uploadToCloudinary(files.logo);
    if (!uploadLogo.secure_url) {
      throw new AppError(400, "Failed to upload logo");
    }
    payload.leagueLogo = uploadLogo.secure_url;
  }

  if (files.banner) {
    const uploadBanner = await fileUploader.uploadToCloudinary(files.banner);
    if (!uploadBanner.secure_url) {
      throw new AppError(400, "Failed to upload banner");
    }
    payload.bannerImage = uploadBanner.secure_url;
  }

  const joinOtp = generateJoinOtp();

  const league = await AmericanoLeague.create({
    ...payload,
    user: user._id,
    joinOtp,
    players: [],
    fixturesGenerated: false,
    matchPlay: payload.matchPlay || "Once",
  });

  return league;
};

const joinLeague = async (email: string, leagueId: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");

  const league = await AmericanoLeague.findById(leagueId);
  if (!league) throw new AppError(404, "Americano league not found");

  return joinLeagueWithValidations(league, user._id.toString());
};

const joinLeagueByOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");

  if (!otp) {
    throw new AppError(400, "OTP is required");
  }

  const league = await AmericanoLeague.findOne({ joinOtp: String(otp).trim() });
  if (!league) throw new AppError(404, "Invalid OTP");

  return joinLeagueWithValidations(league, user._id.toString());
};

const joinLeagueWithValidations = async (
  league: any,
  userId: string
) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (league.fixturesGenerated) {
    throw new AppError(400, "Fixtures already generated. Joining is closed.");
  }

  if (new Date(league.startDate) <= new Date()) {
    throw new AppError(400, "League already started. Joining is closed.");
  }

  const alreadyJoined = league.players.some(
    (player: any) => toObjectIdString(player) === userId
  );
  if (alreadyJoined) {
    throw new AppError(400, "You already joined this Americano league");
  }

  if (league.maxPlayers && league.maxPlayers > 0) {
    if (league.players.length >= league.maxPlayers) {
      throw new AppError(400, "Americano league has reached max players");
    }
  }

  league.players.push(userObjectId as any);
  await league.save();

  return league;
};

const generateFixtures = async (leagueId: string, currentUserId: string) => {
  const league = await AmericanoLeague.findById(leagueId);
  if (!league) throw new AppError(404, "Americano league not found");

  if (league.user.toString() !== currentUserId.toString()) {
    throw new AppError(403, "Only league owner can generate fixtures");
  }

  return generateFixturesForLeague(league);
};

const generateFixturesForLeague = async (league: IAmericanoLeague & any) => {
  const leagueId = toObjectIdString(league._id);
  const existingMatches = await AmericanoMatch.countDocuments({ league: leagueId });
  if (existingMatches > 0 || league.fixturesGenerated) {
    throw new AppError(400, "Fixtures already generated for this league");
  }

  const playerIds = league.players.map(
    (player: any) => new mongoose.Types.ObjectId(toObjectIdString(player))
  );

  if (playerIds.length < 2) {
    throw new AppError(400, "At least 2 players are required to generate fixtures");
  }

  await seedStandings(new mongoose.Types.ObjectId(leagueId), playerIds);

  const legs = getLegCount(league.matchPlay);
  const fixtures = generateFixturesOrdered(playerIds, legs);
  const defaultMatchDate = league.startDate ? new Date(league.startDate) : new Date();

  const matchesToInsert = fixtures.map((fixture) => ({
    league: league._id,
    playerOne: fixture.playerOne,
    playerTwo: fixture.playerTwo,
    matchDateTime: defaultMatchDate,
    matchStatus: "upcoming",
  }));

  if (matchesToInsert.length > 0) {
    await AmericanoMatch.insertMany(matchesToInsert);
  }

  league.fixturesGenerated = true;
  await league.save();

  const uniquePlayerIds = [
    ...new Set(playerIds.map((player: mongoose.Types.ObjectId) => player.toString())),
  ];

  if (uniquePlayerIds.length > 0) {
    await Notification.insertMany(
      uniquePlayerIds.map((userId) => ({
        userId,
        title: "🎾 Americano Fixtures Generated",
        message: `Your fixtures for ${league.leagueName} (${matchesToInsert.length} matches) are now ready. Starting on ${new Date(league.startDate).toLocaleDateString()}.`,
        type: "league",
        read: false,
      }))
    );
  }

  return {
    fixturesCount: matchesToInsert.length,
    totalPlayers: playerIds.length,
  };
};

const autoGenerateFixturesForDueLeagues = async () => {
  const now = new Date();
  
  // ✅ Check for:
  // 1. Leagues starting TODAY (same as league format)
  // 2. Leagues that started in the past but fixtures not generated
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Query: leagues starting today OR leagues with past startDate that haven't generated fixtures
  const dueLeagues = await AmericanoLeague.find({
    $or: [
      // Leagues starting today
      { startDate: { $gte: startOfDay, $lte: endOfDay }, fixturesGenerated: false },
      // Leagues that started in the past but fixtures not generated (attempt once)
      { startDate: { $lt: startOfDay }, fixturesGenerated: false },
    ],
  });

  let generatedCount = 0;
  let skippedCount = 0;

  for (const league of dueLeagues) {
    try {
      // Only generate if league has at least 2 players
      if (!league.players || league.players.length < 2) {
        console.log(`⚠️  Americano: Skipped ${league.leagueName} - needs at least 2 players (has ${league.players?.length || 0})`);
        skippedCount += 1;
        continue;
      }

      const result = await generateFixturesForLeague(league as any);
      generatedCount += 1;
      console.log(`✅ Americano: Generated ${result.fixturesCount} fixtures for league: ${league.leagueName}`);
    } catch (err) {
      skippedCount += 1;
      console.error(`❌ Americano: Failed to generate fixtures for league ${league.leagueName}:`, (err as any)?.message);
    }
  }

  if (generatedCount > 0 || skippedCount > 0) {
    console.log(`🎾 Americano Auto-Generation Summary: ${generatedCount} succeeded, ${skippedCount} skipped (checked ${dueLeagues.length} leagues)`);
  }

  return {
    checkedCount: dueLeagues.length,
    generatedCount,
    skippedCount,
  };
};

const listLeagues = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];

  if (searchTerm) {
    andCondition.push({
      $or: [
        { leagueName: { $regex: searchTerm, $options: "i" } },
        { location: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    });
  }

  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereCondition = andCondition.length ? { $and: andCondition } : {};

  const data = await AmericanoLeague.find(whereCondition)
    .populate("user", "name email")
    .populate("players", "name email")
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 } as any)
    .skip(skip)
    .limit(limit);

  const total = await AmericanoLeague.countDocuments(whereCondition);

  return {
    data,
    meta: { total, page, limit },
  };
};

const getLeagueById = async (leagueId: string) => {
  const league = await AmericanoLeague.findById(leagueId)
    .populate("user", "name email")
    .populate("players", "name email");

  if (!league) throw new AppError(404, "Americano league not found");
  return league;
};

const getLeagueFixtures = async (leagueId: string) => {
  const league = await AmericanoLeague.findById(leagueId).select("_id leagueName");
  if (!league) throw new AppError(404, "Americano league not found");

  return AmericanoMatch.find({ league: leagueId })
    .populate("playerOne", "name email")
    .populate("playerTwo", "name email")
    .populate("winnerPlayer", "name email")
    .sort({ matchDateTime: 1, createdAt: 1 });
};

const getLeagueStandings = async (leagueId: string) => {
  const league = await AmericanoLeague.findById(leagueId).select("_id");
  if (!league) throw new AppError(404, "Americano league not found");

  return AmericanoStanding.find({ league: leagueId })
    .populate("player", "name email")
    .sort({ position: 1, points: -1, setDifference: -1, goalDifference: -1 });
};

const getMyLeagues = async (email: string, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);

  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");

  const userId = user._id;

  const whereCondition = {
    $or: [
      { user: userId },
      { players: userId },
    ],
  };

  const data = await AmericanoLeague.find(whereCondition)
    .populate("user", "name email")
    .populate("players", "name email")
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 } as any)
    .skip(skip)
    .limit(limit);

  const total = await AmericanoLeague.countDocuments(whereCondition);

  return {
    data,
    meta: { total, page, limit },
  };
};

const submitMatchResult = async (
  matchId: string,
  payload: Pick<IAmericanoMatch, "matchScore" | "winnerPlayer">,
  currentUserId: string
) => {
  const match = await AmericanoMatch.findById(matchId)
    .populate("league", "user leagueName")
    .populate("playerOne", "name email")
    .populate("playerTwo", "name email");
  if (!match) throw new AppError(404, "Americano match not found");

  const leagueUser = (match.league as any)?.user?.toString?.();
  if (!leagueUser || leagueUser !== currentUserId.toString()) {
    throw new AppError(403, "Only league owner can submit result");
  }

  if (!payload.matchScore?.sets?.length) {
    throw new AppError(400, "matchScore.sets is required");
  }

  match.matchScore = payload.matchScore;
  match.matchStatus = "completed";

  let p1SetsWon = 0;
  let p2SetsWon = 0;
  for (const set of payload.matchScore.sets) {
    if (set.playerOneGames > set.playerTwoGames) p1SetsWon += 1;
    else if (set.playerTwoGames > set.playerOneGames) p2SetsWon += 1;
  }

  if (payload.winnerPlayer !== undefined) {
    match.winnerPlayer = payload.winnerPlayer;
  } else if (p1SetsWon === p2SetsWon) {
    match.winnerPlayer = null;
  } else if (p1SetsWon > p2SetsWon) {
    match.winnerPlayer = match.playerOne as any;
  } else {
    match.winnerPlayer = match.playerTwo as any;
  }

  await match.save();
  await rebuildStandings(toObjectIdString(match.league));

  // ✅ Send notifications for match result (following league pattern)
  const playerOne = match.playerOne as any;
  const playerTwo = match.playerTwo as any;
  const league = match.league as any;
  const leagueName = league?.leagueName || "Americano League";

  const p1Goals = match.matchScore?.sets.reduce((a, s) => a + (s.playerOneGames || 0), 0) || 0;
  const p2Goals = match.matchScore?.sets.reduce((a, s) => a + (s.playerTwoGames || 0), 0) || 0;

  const isDraw = match.winnerPlayer === null;

  if (isDraw) {
    // Send draw notifications to both players
    const notifications = [
      {
        userId: toObjectIdString(playerOne._id),
        title: "Match Draw",
        message: `🤝 Your match vs ${playerTwo.name} in ${leagueName} ended in a draw (${p1Goals}-${p2Goals})`,
        type: "match",
        read: false,
      },
      {
        userId: toObjectIdString(playerTwo._id),
        title: "Match Draw",
        message: `🤝 Your match vs ${playerOne.name} in ${leagueName} ended in a draw (${p2Goals}-${p1Goals})`,
        type: "match",
        read: false,
      },
    ];
    await Notification.insertMany(notifications);
  } else if (match.winnerPlayer) {
    // Send winner/loser notifications
    const winnerId = toObjectIdString(match.winnerPlayer);
    const isP1Winner = toObjectIdString(playerOne._id) === winnerId;
    const winner = isP1Winner ? playerOne : playerTwo;
    const loser = isP1Winner ? playerTwo : playerOne;

    const notifications = [
      {
        userId: winnerId,
        title: "Match Won! 🏆",
        message: `🏆 You won vs ${loser.name} in ${leagueName}! (${isP1Winner ? p1Goals : p2Goals}-${isP1Winner ? p2Goals : p1Goals})`,
        type: "success",
        read: false,
      },
      {
        userId: toObjectIdString(loser._id),
        title: "Match Lost",
        message: `📉 You lost vs ${winner.name} in ${leagueName}. (${isP1Winner ? p2Goals : p1Goals}-${isP1Winner ? p1Goals : p2Goals})`,
        type: "match",
        read: false,
      },
    ];
    await Notification.insertMany(notifications);
  }

  return AmericanoMatch.findById(matchId)
    .populate("playerOne", "name email")
    .populate("playerTwo", "name email")
    .populate("winnerPlayer", "name email");
};

export const americanoService = {
  createLeague,
  joinLeague,
  joinLeagueByOtp,
  generateFixtures,
  listLeagues,
  getMyLeagues,
  getLeagueById,
  getLeagueFixtures,
  getLeagueStandings,
  submitMatchResult,
  rebuildStandings,
  autoGenerateFixturesForDueLeagues,
};
