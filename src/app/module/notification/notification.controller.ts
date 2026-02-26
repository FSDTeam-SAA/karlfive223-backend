import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { Notification } from "./notification.model";
import AppError from "../../error/appError";
import { Types } from "mongoose";

/***********************************
 * MARK SINGLE NOTIFICATION AS READ *
 ***********************************/
export const markAsReadById = catchAsycn(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user?._id;

  console.log("🔍 Mark single as read called");
  console.log("👤 User ID from token:", userId);
  console.log("📝 Notification ID:", notificationId);

  // Find notification and verify it belongs to the user
  const notification = await Notification.findById(notificationId);
  
  if (!notification) {
    throw new AppError(404, "Notification not found");
  }

  // Convert to ObjectId for comparison
  const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
  
  console.log("🔍 Notification userId:", notification.userId);
  console.log("🔍 Comparing with:", userObjectId);

  // Verify the notification belongs to the requesting user
  if (notification.userId.toString() !== userObjectId.toString()) {
    throw new AppError(403, "You are not authorized to modify this notification");
  }

  // Mark as read
  notification.read = true;
  await notification.save();
  
  console.log("✅ Notification marked as read successfully");

  sendResponse(res, {
    statusCode: 200,
    message: "Notification marked as read",
    success: true,
    data: notification,
  });
});

/********************************
 * MARK ALL NOTIFICATIONS AS READ *
 ********************************/
export const markAllAsRead = catchAsycn(async(req,res)=>{
    const userId = req.user?._id;
    
    console.log("🔍 Mark all as read called");
    console.log("👤 User ID from token:", userId);
    console.log("📝 User object:", req.user);
    
    if (!userId) {
      throw new AppError(401, "Unauthorized. User ID not found");
    }
    
    // Convert to ObjectId to ensure type match
    const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
    
    // First, check how many unread notifications exist
    const unreadCount = await Notification.countDocuments({ 
      userId: userObjectId, 
      read: false 
    });
    console.log(`📊 Found ${unreadCount} unread notifications for user ${userObjectId}`);
    
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { userId: userObjectId, read: false },  // Only update unread ones
      { $set: { read: true } }          // Use $set operator
    );
    
    console.log(`✅ Updated ${result.modifiedCount} notifications to read`);
    
    sendResponse(res,{
        statusCode: 200,
        message: "All notifications marked as read",
        success: true,
        data: {
          modifiedCount: result.modifiedCount,
          message: `${result.modifiedCount} notifications marked as read`
        }
    })   
})

export const getAllNotification = catchAsycn(async(req,res)=>{
    const userId = req.user?._id;
    
    console.log("📋 Get all notifications called");
    console.log("👤 User ID from token:", userId);
    
    const allNotifications = await Notification.find({userId:userId}).sort({createdAt:-1});
    
    console.log(`📊 Found ${allNotifications.length} total notifications`);
    console.log(`✅ Read notifications: ${allNotifications.filter(n => n.read).length}`);
    console.log(`📬 Unread notifications: ${allNotifications.filter(n => !n.read).length}`);
    
    sendResponse(res,{
        statusCode: 200,
        message: "All notifications",
        success: true,
        data: allNotifications
        })
})
/*********************************
 * GET ALL NOTIFICATIONS BY USER *
 *********************************/
export const getUserNotifications = catchAsycn(
  async (req, res) => {
    const { userId } = req.params

    const notifications = await Notification.find({ userId: userId }).sort({
      createdAt: -1,
    })

    res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      data: notifications,
    })
  }
)
