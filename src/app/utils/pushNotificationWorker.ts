import { getChannel } from "../utils/rabbitmq";
import { FCM } from "../module/fcm/fcm.model";
import admin from "../utils/firebase";

const CHUNK_SIZE = 50;

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

export const startPushNotificationWorker = async () => {
  const channel = getChannel();

  channel.consume("push_notifications", async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      const { userIds, title, body } = data;

      const users = await FCM.find({
        user: { $in: userIds },
        fcmToken: { $exists: true, $ne: null },
      }).select("fcmToken");

      const tokens = users
        .map((u) => u.fcmToken)
        .filter(
          (token): token is string =>
            typeof token === "string" && token.length > 0
        );

      if (!tokens.length) {
        channel.ack(msg);
        return;
      }

      console.log(`Worker: Found ${tokens.length} tokens for users: ${userIds.join(", ")}`);
      console.log(`Worker: Sending notification - Title: "${title}", Body: "${body}"`);

      const tokenChunks = chunkArray(tokens, CHUNK_SIZE);
      

      for (const chunk of tokenChunks) {
        const message = {
          notification: {
            title,
            body,
          },
          tokens: chunk,
        };

        const response =
          await admin.messaging().sendEachForMulticast(message);

        console.log(
          `Chunk Sent: ${response.successCount}/${chunk.length}`
        );

        // Optional small delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      channel.ack(msg);
    } catch (error) {
      console.error("Worker Error:", error);

      // requeue false prevents infinite loop
      channel.nack(msg, false, false);
    }
  });

  console.log("Push Notification Worker Started");
};