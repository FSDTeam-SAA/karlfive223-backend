import { Types } from "mongoose";
import { Server as SocketIOServer } from "socket.io";
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
 * Transforms data to match Flutter's expected format
 * @param userId - The user ID to send notification to
 * @param notification - The notification data
 */
export const sendNotificationToUser = (
  userId: string | Types.ObjectId,
  notification: { title: string; message: string; type: string; _id?: any; read?: boolean; createdAt?: Date; updatedAt?: Date }
) => {
  if (!io) {
    console.warn("Socket.IO instance not initialized");
    return;
  }

  const userIdStr = userId.toString();
  
  // Transform to Flutter's expected format
  const flutterNotification = {
    _id: notification._id?.toString() || '',
    to: userIdStr,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isViewed: notification.read || false,
    createdAt: (notification.createdAt || new Date()).toISOString(),
    updatedAt: (notification.updatedAt || new Date()).toISOString(),
  };
  
  io.to(userIdStr).emit("notification", flutterNotification);
  console.log(`📤 Notification sent to ${userIdStr}:`, notification.title);
};

/**
 * Send notifications to multiple users via Socket.IO
 * Transforms data to match Flutter's expected format
 * @param userIds - Array of user IDs
 * @param notification - The notification data
 */
export const sendNotificationToUsers = (
  userIds: (string | Types.ObjectId)[],
  notification: { title: string; message: string; type: string; _id?: any; read?: boolean; createdAt?: Date; updatedAt?: Date }
) => {
  if (!io) {
    console.warn("Socket.IO instance not initialized");
    return;
  }

  userIds.forEach((userId) => {
    const userIdStr = userId.toString();
    
    // Transform to Flutter's expected format
    const flutterNotification = {
      _id: notification._id?.toString() || '',
      to: userIdStr,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isViewed: notification.read || false,
      createdAt: (notification.createdAt || new Date()).toISOString(),
      updatedAt: (notification.updatedAt || new Date()).toISOString(),
    };
    
    io?.to(userIdStr).emit("notification", flutterNotification);
  });

  console.log(`📤 Notification sent to ${userIds.length} users`);
};

/**
 * Emit updated unread notification count to a user via Socket.IO
 * Call this after any read/unread status change
 * @param userId - The user ID
 */
export const emitUnreadCount = async (
  userId: string | Types.ObjectId
) => {
  if (!io) return;

  const userIdStr = userId.toString();
  const unreadCount = await Notification.countDocuments({ userId: userIdStr, read: false });

  io.to(userIdStr).emit("unreadCount", { unreadCount });
  console.log(`🔔 Unread count emitted to ${userIdStr}: ${unreadCount}`);
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
  io.to(matchIdStr).emit("newMessage", messageData);
  console.log(`💬 Message sent to match ${matchIdStr}`);
};

/**
 * Create notifications in database and send to users via Socket.IO
 * @param userIds - Array of user IDs to notify
 * @param title - The notification title
 * @param message - The notification message
 * @param type - Notification type (success, error, warning, match, league, event, general)
 */
export const createAndSendNotifications = async (
  userIds: (string | Types.ObjectId)[],
  title: string,
  message: string,
  type: "success" | "error" | "warning" | "match" | "league" | "event" | "general" = "success"
) => {
  try {
    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds.map((id) => id.toString()))];

    if (uniqueUserIds.length === 0) return;

    // Create notifications in database
    const notifications = await Notification.insertMany(
      uniqueUserIds.map((uid) => ({
        userId: uid,
        title,
        message,
        type,
        read: false,
      }))
    );

    // Send notifications via Socket.IO in Flutter's expected format
    if (io) {
      for (const notification of notifications) {
        const notificationData: any = notification.toObject ? notification.toObject() : notification;
        const userIdStr = notification.userId.toString();
        
        // Transform to Flutter's expected format
        const flutterNotification = {
          _id: notificationData._id.toString(),
          to: userIdStr,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          isViewed: notificationData.read,
          createdAt: notificationData.createdAt.toISOString(),
          updatedAt: notificationData.updatedAt.toISOString(),
        };
        
        // Emit the new notification event
        io.to(userIdStr).emit("notification", flutterNotification);
        console.log(`📬 Notification sent to ${userIdStr}:`, title);
        
        // Emit updated unread count so badge updates instantly
        const unreadCount = await Notification.countDocuments({ userId: notification.userId, read: false });
        io.to(userIdStr).emit("unreadCount", { unreadCount });
        console.log(`🔔 Unread count emitted to ${userIdStr}: ${unreadCount}`);
      }
    }

    console.log(`✅ Created and sent ${notifications.length} notifications`);
    return notifications;
  } catch (error) {
    console.error("❌ Error creating and sending notifications:", error);
    throw error;
  }
};
