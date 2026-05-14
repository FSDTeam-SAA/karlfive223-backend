import * as admin from "firebase-admin";

export const sendSubscriptionNotification = async (
  title: string,
  message: string
) => {
  const response = await admin.messaging().send({
    topic: "all_users",
    notification: {
      title,
      body: message,
    },
    data: {
      type: "news",
      id: "456",
    },
  });

  return response;
};