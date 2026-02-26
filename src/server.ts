import mongoose, { Types } from "mongoose";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import config from "./app/config";
import cron from "node-cron";
import League from "./app/module/league/league.model";
import Match from "./app/module/match/match.model";
import Standing from "./app/module/standing/standing.model";
import { Notification } from "./app/module/notification/notification.model";
import Team from "./app/module/team/team.model";
import { Payment } from "./app/module/payment/payment.model";
import { setSocketInstance } from "./app/helper/socketHelper";

const port = config.port || 5000;

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});
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

async function notifyUsers(userIds: Types.ObjectId[], message: string) {
  const unique = [...new Set(userIds.map((id) => id.toString()))].map(
    (id) => new Types.ObjectId(id)
  );

  if (unique.length === 0) return;

  await Notification.insertMany(
    unique.map((uid) => ({
      userId: uid,
      message,
      type: "success",
      read: false,
    }))
  );
}
const server = async () => {
  try {
    const connectmongodb = await mongoose.connect(config.database_url as string);
    console.log(`✅ Database is connected: ${connectmongodb.connection.host}`);

    // Set up Socket.IO connections
    setSocketInstance(io);
    
    io.on("connection", (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Join user to their personal room for notifications
      socket.on("join", (userId: string) => {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined their notification room`);
      });

      // Join match-specific chat room
      socket.on("joinMatch", (matchId: string) => {
        socket.join(`match_${matchId}`);
        console.log(`⚽ Socket ${socket.id} joined match_${matchId}`);
      });

      // Leave match chat room
      socket.on("leaveMatch", (matchId: string) => {
        socket.leave(`match_${matchId}`);
        console.log(`👋 Socket ${socket.id} left match_${matchId}`);
      });

      socket.on("disconnect", () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
      });
    });

    httpServer.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port} with ci-cd`);
      console.log(`🔌 Socket.IO server is ready`);
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
          const defaultMatchDate = league.startDate ? new Date(league.startDate) : new Date();
          // ✅ ordered fixtures (NO date)
          const fixtures = generateFixturesOrdered(teamIds, play);

          const matchesToInsert = fixtures.map((f) => ({
            teamOne: f.teamOne,
            teamTwo: f.teamTwo,
            league: league._id,
            matchVenue: null,
            matchDateTime: defaultMatchDate,
            matchStatus: "upcoming",
          }));

          if (matchesToInsert.length > 0) {
            await Match.insertMany(matchesToInsert);
            console.log(
              `🎯 ${matchesToInsert.length} matches created for ${league.leagueName}`
            );
          }
          const teamIds1 = [
            ...new Set(
              matchesToInsert.flatMap((m) => [m.teamOne.toString(), m.teamTwo.toString()])
            ),
          ];

          const teams1 = await Team.find({ _id: { $in: teamIds1 } })
            .select("teamName user player")
            .lean();

          const teamMap = new Map(teams1.map((t: any) => [t._id.toString(), t]));
          // 2) Build notifications: each match => notify both teams (user + player)
          const notifications: any[] = [];

          for (const m of matchesToInsert) {
            const t1 = teamMap.get(m.teamOne.toString());
            const t2 = teamMap.get(m.teamTwo.toString());

            if (!t1 || !t2) continue;

            const leagueName = league.leagueName;

            // notify team 1 users
            const t1Users = [t1.user, t1.player].filter(Boolean);
            for (const uid of t1Users) {
              notifications.push({
                userId: uid,
                message: `📅 Match scheduled: Your team ${t1.teamName} will play vs ${t2.teamName} in ${leagueName}.`,
                type: "success",
                read: false,
              });
            }

            // notify team 2 users
            const t2Users = [t2.user, t2.player].filter(Boolean);
            for (const uid of t2Users) {
              notifications.push({
                userId: uid,
                message: `📅 Match scheduled: Your team ${t2.teamName} will play vs ${t1.teamName} in ${leagueName}.`,
                type: "success",
                read: false,
              });
            }
          }

          // 3) Insert all notifications in one query
          if (notifications.length > 0) {
            await Notification.insertMany(notifications);
          }
        }
      } catch (err) {
        console.error("❌ Error in cron job:", err);
      }
    });

    // 🔄 Cron job to expire subscriptions after 31 days
    cron.schedule("0 0 * * *", async () => {
      console.log("🔄 Checking for expired subscriptions...");

      try {
        const now = new Date();

        // Find all subscriptions with status 'success' that have passed their expiry date
        const expiredSubscriptions = await Payment.find({
          type: "subscription",
          status: "success",
          expiryDate: { $lte: now },
        });

        if (expiredSubscriptions.length > 0) {
          // Update all expired subscriptions to 'pending'
          await Payment.updateMany(
            {
              type: "subscription",
              status: "success",
              expiryDate: { $lte: now },
            },
            {
              status: "pending",
            }
          );

          console.log(`✅ ${expiredSubscriptions.length} subscriptions expired and set to pending.`);
        } else {
          console.log("✅ No expired subscriptions found.");
        }
      } catch (err) {
        console.error("❌ Error in subscription expiry cron job:", err);
      }
    });
  } catch (error: any) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

server();
