import { FCM } from "../module/fcm/fcm.model";
import admin from "../utils/firebase";
// import User from "../models/User";

// export const sendPushNotification = async (
//   userIds: string[],
//   title: string,
//   body: string
// ) => {
//   try {
//     // Get users with FCM tokens
//     // const users = await User.find({
//     //   _id: { $in: userIds },
//     //   fcmToken: { $exists: true, $ne: null },
//     // }).select("fcmToken");
//     const users = await FCM.find({
//       user: { $in: userIds },
//       fcmToken: { $exists: true, $ne: null },
//     }).select("fcmToken");
//     console.log(users)

//     console.log(`Found ${users} users with FCM tokens for notification.`);

//     const tokens = users
//       .map((u) => u.fcmToken)
//       .filter((token): token is string => typeof token === 'string' && token.length > 0);

//     if (!tokens.length) return;

//     const message = {
//       notification: {
//         title,
//         body,
//       },
//       tokens,
//     };

//     const response = await admin.messaging().sendEachForMulticast(message);

//     console.log("Push sent:", response.successCount);
//   } catch (error) {
//     console.error("FCM Error:", error);
//   }
// };


import { getChannel } from "../utils/rabbitmq";

export const sendPushNotification = async (
  userIds: string[],
  title: string,
  body: string,
  // Mirrors the in-app Notification document's entityType/relatedId (see
  // createAndSendNotifications) so a tapped push opens the same screen a
  // tapped in-app notification would. Omit for pushes with nothing to
  // navigate to — the message is then sent with no `data` block, same as
  // before this was added.
  target?: { entityType?: string; relatedId?: string }
) => {
  try {
    const channel = getChannel();

    const payload = {
      userIds,
      title,
      body,
      ...(target?.entityType && target?.relatedId
        ? { entityType: target.entityType, relatedId: String(target.relatedId) }
        : {}),
    };

    channel.sendToQueue(
      "push_notifications",
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
      }
    );

    console.log("Notification added to queue");
  } catch (error) {
    console.error("Queue Error:", error);
  }
};