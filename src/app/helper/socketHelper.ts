import { Server as SocketIOServer } from "socket.io";
import { Types } from "mongoose";
import { Notification } from "../module/notification/notification.model";

let io: SocketIOServer | null = null;

/**
 * Set the Socket.IO instance to be used throughout the application
 */
export const setSocketInstance = (socketInstance: SocketIOServer) => {
  io = socketInstance;
};

/**
 * Get the Socket.IO instance
 */
export const getSocketInstance = (): SocketIOServer | null => {
  return io;
};

/**
 * Send a notification to a specific user via Socket.IO
 * @param userId - The user ID to send notification to
 * @param notification - The notification data
 */
export const sendNotificationToUser = (
  userId: string | Types.ObjectId,
  notification: { message: string; type: string; _id?: any }
) => {
  if (!io) {
    console.warn("Socket.IO instance not initialized");
    return;
  }

  const userIdStr = userId.toString();
  io.to(`user_${userIdStr}`).emit("notification", notification);
  console.log(`📤 Notification sent to user_${userIdStr}`);
};

/**
 * Send notifications to multiple users via Socket.IO
 * @param userIds - Array of user IDs
 * @param notification - The notification data
 */
export const sendNotificationToUsers = (
  userIds: (string | Types.ObjectId)[],
  notification: { message: string; type: string }
) => {
  if (!io) {
    console.warn("Socket.IO instance not initialized");
    return;
  }

  userIds.forEach((userId) => {
    const userIdStr = userId.toString();
    io?.to(`user_${userIdStr}`).emit("notification", notification);
  });

  console.log(`📤 Notification sent to ${userIds.length} users`);
};

/**
 * Send a chat message notification to all users in a match
 * @param matchId - The match ID
 * @param messageData - The message data to broadcast
 */
export const sendChatMessageToMatch = (
  matchId: string | Types.ObjectId,
  messageData: any
) => {
  if (!io) {
    console.warn("Socket.IO instance not initialized");
    return;
  }

  const matchIdStr = matchId.toString();
  io.to(`match_${matchIdStr}`).emit("newMessage", messageData);
  console.log(`💬 Message sent to match_${matchIdStr}`);
};

/**
 * Create notifications in database and send to users via Socket.IO
 * @param userIds - Array of user IDs to notify
 * @param message - The notification message
 * @param type - Notification type (success, error, warning)
 */
export const createAndSendNotifications = async (
  userIds: (string | Types.ObjectId)[],
  message: string,
  type: "success" | "error" | "warning" = "success"
) => {
  try {
    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds.map((id) => id.toString()))];

    if (uniqueUserIds.length === 0) return;

    // Create notifications in database
    const notifications = await Notification.insertMany(
      uniqueUserIds.map((uid) => ({
        userId: uid,
        message,
        type,
        read: false,
      }))
    );

    // Send notifications via Socket.IO
    if (io) {
      notifications.forEach((notification) => {
        const notificationData: any = notification.toObject ? notification.toObject() : notification;
        io?.to(`user_${notification.userId.toString()}`).emit("notification", {
          _id: notificationData._id,
          message: notificationData.message,
          type: notificationData.type,
          read: notificationData.read,
          createdAt: notificationData.createdAt,
        });
      });
    }

    console.log(`✅ Created and sent ${notifications.length} notifications`);
    return notifications;
  } catch (error) {
    console.error("❌ Error creating and sending notifications:", error);
    throw error;
  }
};
