import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import cron from "node-cron";
import League from "./app/module/league/league.model";
import Match from "./app/module/match/match.model";
import Standing from "./app/module/standing/standing.model";

const port = config.port || 5000;

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
    cron.schedule("* * * * *", async () => {
      console.log("🔄 Cron job started: checking leagues...");

      try {
        const today = new Date();
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate());

        const leagues = await League.find({
          startDate: {
            $gte: new Date(threeDaysLater.setHours(0, 0, 0, 0)),
            $lte: new Date(threeDaysLater.setHours(23, 59, 59, 999)),
          },
        }).populate("addTeams");
        console.log(`🔍 Found ${leagues} leagues starting in 3 days.`);



        for (const league of leagues) {
          // console.log(league)
          // console.log(`🔍 Processing league: ${league.addTeams?.length}`) ;
          const existingMatches = await Match.find({ league: league._id });
          if (existingMatches.length > 0) {
            console.log(`⚠️ Matches already exist for ${league.leagueName}`);
            continue;
          }
          let play = 1
          if(league.matchPlay  === "once" || league.matchPlay === "Once"){

             play = 1;
          }
          if(league.matchPlay  === "twice" || league.matchPlay === "Twice"){
             play = 2;
          }
          if(league.matchPlay  === "thrice" || league.matchPlay === "Thrice"){

             play = 3;
          }
          // console.log(`📝 Generating matches for league: ${league.leagueName}`);
          console.log(`📝 Number of teams: ${play}`);

          const teams = league.addTeams as mongoose.Types.ObjectId[];
          const matches = [];

          for (let i = 0; i < teams.length; i++) {
            await Standing.create({
              team: teams[i],
              league: league._id,
            })
            for (let k = 0; k < play; k++) {
              for (let j = i + 1; j < teams.length; j++) {
                matches.push({
                  teamOne: teams[i],
                  teamTwo: teams[j],
                  // matchDateTime: league.startDate,
                  matchVenue: null,
                  league: league._id,
                  matchStatus: "upcoming",
                });
              }
            }
          }

          if (matches.length > 0) {
            await Match.insertMany(matches);
            console.log(`🎯 ${matches.length} matches created for ${league.leagueName}`);
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
