import { FCM } from "../module/fcm/fcm.model";
import admin from "../utils/firebase";
// import User from "../models/User";

export const sendPushNotification = async (
  userIds: string[],
  title: string,
  body: string
) => {
  try {
    // Get users with FCM tokens
    // const users = await User.find({
    //   _id: { $in: userIds },
    //   fcmToken: { $exists: true, $ne: null },
    // }).select("fcmToken");
    const users = await FCM.find({
      user: { $in: userIds },
      fcmToken: { $exists: true, $ne: null },
    }).select("fcmToken");
    console.log(users)

    console.log(`Found ${users} users with FCM tokens for notification.`);

    const tokens = users
      .map((u) => u.fcmToken)
      .filter((token): token is string => typeof token === 'string' && token.length > 0);

    if (!tokens.length) return;

    const message = {
      notification: {
        title,
        body,
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("Push sent:", response.successCount);
  } catch (error) {
    console.error("FCM Error:", error);
  }
};