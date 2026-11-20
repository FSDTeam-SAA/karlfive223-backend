import cron from "node-cron";
import { matchReminderService } from "./matchReminder.service";

export const matchReminderCron = () => {
  // For running the server locally against a shared database: without this, a
  // developer's machine would message real players.
  if (process.env.DISABLE_MATCH_REMINDERS === "true") {
    console.log("⏰ Match reminders are off (DISABLE_MATCH_REMINDERS)");
    return;
  }

  // Every 5 minutes. Safe to overlap: each match is claimed before sending.
  cron.schedule("*/5 * * * *", async () => {
    try {
      const sent = await matchReminderService.sendMatchReminders();
      if (sent > 0) console.log(`⏰ Match reminders sent to ${sent} players`);
    } catch (err) {
      console.error("❌ Error in match reminder cron:", err);
    }
  });
};
