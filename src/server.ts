import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import cron from "node-cron";
import League from "./app/module/league/league.model";
import Match from "./app/module/match/match.model";
import Standing from "./app/module/standing/standing.model";

const port = config.port || 5000;
export const generateFixturesOrdered = (
  teamIdsInput: mongoose.Types.ObjectId[],
  legs: number = 1
) => {
  let teams = [...teamIdsInput];

  // If odd, add BYE
  if (teams.length % 2 === 1) teams.push(null as any);

  const n = teams.length;        // even
  const rounds = n - 1;
  const matchesPerRound = n / 2;

  const fixed = teams[0];
  const originalRotating = teams.slice(1);

  const fixtures: { teamOne: any; teamTwo: any }[] = [];

  for (let leg = 1; leg <= legs; leg++) {
    let rotating = [...originalRotating];

    for (let r = 1; r <= rounds; r++) {
      const current = [fixed, ...rotating];

      for (let i = 0; i < matchesPerRound; i++) {
        const t1 = current[i];
        const t2 = current[n - 1 - i];

        if (!t1 || !t2) continue; // skip BYE

        // home/away balance
        const flip = (r + leg) % 2 === 0;
        fixtures.push({
          teamOne: flip ? t2 : t1,
          teamTwo: flip ? t1 : t2,
        });
      }

      // rotate: [a,b,c,d] -> [d,a,b,c]
      rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
    }
  }

  return fixtures;
};

const server = async () => {
  try {
    const connectmongodb = await mongoose.connect(config.database_url as string);
    console.log(`✅ Database is connected: ${connectmongodb.connection.host}`);

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });

    // ===========================
    // 🔹 CRON JOB: Auto-generate matches 3 days before league start
    // Runs every day at 12 AM
    // ===========================
    // cron.schedule("* * * * *", async () => {
    //   console.log("🔄 Cron job started: checking leagues...");

    //   try {
    //     const today = new Date();
    //     const threeDaysLater = new Date(today);
    //     threeDaysLater.setDate(today.getDate());

    //     const leagues = await League.find({
    //       startDate: {
    //         $gte: new Date(threeDaysLater.setHours(0, 0, 0, 0)),
    //         $lte: new Date(threeDaysLater.setHours(23, 59, 59, 999)),
    //       },
    //     }).populate("addTeams");
    //     console.log(`🔍 Found ${leagues} leagues starting in 3 days.`);



    //     for (const league of leagues) {
    //       // console.log(league)
    //       // console.log(`🔍 Processing league: ${league.addTeams?.length}`) ;
    //       const existingMatches = await Match.find({ league: league._id });
    //       if (existingMatches.length > 0) {
    //         console.log(`⚠️ Matches already exist for ${league.leagueName}`);
    //         continue;
    //       }
    //       let play = 1
    //       if(league.matchPlay  === "once" || league.matchPlay === "Once"){

    //          play = 1;
    //       }
    //       if(league.matchPlay  === "twice" || league.matchPlay === "Twice"){
    //          play = 2;
    //       }
    //       if(league.matchPlay  === "thrice" || league.matchPlay === "Thrice"){

    //          play = 3;
    //       }
    //       // console.log(`📝 Generating matches for league: ${league.leagueName}`);
    //       console.log(`📝 Number of teams: ${play}`);

    //       const teams = league.addTeams as mongoose.Types.ObjectId[];
    //       const matches = [];

    //       for (let i = 0; i < teams.length; i++) {
    //         await Standing.create({
    //           team: teams[i],
    //           league: league._id,
    //         })
    //         for (let k = 0; k < play; k++) {
    //           for (let j = i + 1; j < teams.length; j++) {
    //             matches.push({
    //               teamOne: teams[i],
    //               teamTwo: teams[j],
    //               // matchDateTime: league.startDate,
    //               matchVenue: null,
    //               league: league._id,
    //               matchStatus: "upcoming",
    //             });
    //           }
    //         }
    //       }

    //       if (matches.length > 0) {
    //         await Match.insertMany(matches);
    //         console.log(`🎯 ${matches.length} matches created for ${league.leagueName}`);
    //       }
    //     }
    //   } catch (err) {
    //     console.error("❌ Error in cron job:", err);
    //   }
    // });


    cron.schedule("* * * * *", async () => {
      console.log("🔄 Cron job started: checking leagues...");

      try {
        const today = new Date();
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate());

        const startOfDay = new Date(threeDaysLater);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(threeDaysLater);
        endOfDay.setHours(23, 59, 59, 999);

        const leagues = await League.find({
          startDate: { $gte: startOfDay, $lte: endOfDay },
        }).populate("addTeams");

        console.log(`🔍 Found ${leagues.length} leagues starting in 3 days.`);
        // console.log(`🔍 Found ${leagues.length} leagues starting in 3 days.`);

        for (const league of leagues) {
          const existingMatches = await Match.find({ league: league._id });
          if (existingMatches.length > 0) {
            console.log(`⚠️ Matches already exist for ${league.leagueName}`);
            continue;
          }
          console.log(`📝 Generating matches for league: ${league.leagueName}`);

          // matchPlay => 1/2/3
          let play = 1;
          const mp = (league.matchPlay || "").toLowerCase();
          if (mp === "twice") play = 2;
          if (mp === "thrice") play = 3;

          const teams = league.addTeams || [];
          const teamIds = teams.map((t) => t._id ?? t);

          // create standings once
          for (const t of teamIds) {
            await Standing.create({ team: t, league: league._id });
          }

          // ✅ ordered fixtures (NO date)
          const fixtures = generateFixturesOrdered(teamIds, play);

          const matchesToInsert = fixtures.map((f) => ({
            teamOne: f.teamOne,
            teamTwo: f.teamTwo,
            league: league._id,
            matchVenue: null,
            matchStatus: "upcoming",
          }));

          if (matchesToInsert.length > 0) {
            await Match.insertMany(matchesToInsert);
            console.log(
              `🎯 ${matchesToInsert.length} matches created for ${league.leagueName}`
            );
          }
        }
      } catch (err) {
        console.error("❌ Error in cron job:", err);
      }
    });
  } catch (error: any) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

server();
