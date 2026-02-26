import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { Notification } from "./notification.model";
import AppError from "../../error/appError";
import { Types } from "mongoose";
import { emitUnreadCount } from "../../helper/socketHelper";

/***********************************
 * MARK SINGLE NOTIFICATION AS READ *
 ***********************************/
export const markAsReadById = catchAsycn(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user?._id;

  // Find notification and verify it belongs to the user
  const notification = await Notification.findById(notificationId);
  
  if (!notification) {
    throw new AppError(404, "Notification not found");
  }

  // Convert to ObjectId for comparison
  const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
  
  // Verify the notification belongs to the requesting user
  if (notification.userId.toString() !== userObjectId.toString()) {
    throw new AppError(403, "You are not authorized to modify this notification");
  }

  // Mark as read
  notification.read = true;
  await notification.save();

  // Push updated unread count to user via socket so badge updates instantly
  await emitUnreadCount(userObjectId);

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
    
    if (!userId) {
      throw new AppError(401, "Unauthorized. User ID not found");
    }
    
    // Convert to ObjectId to ensure type match
    const userObjectId = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId);
    
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { userId: userObjectId, read: false },
      { $set: { read: true } }
    );

    // Push updated unread count (0) to user via socket so badge clears instantly
    await emitUnreadCount(userObjectId);

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
    
    const allNotifications = await Notification.find({userId:userId}).sort({createdAt:-1});
    
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

    const [unread, read] = await Promise.all([
      Notification.find({ userId: userId, read: false }).sort({ createdAt: -1 }),
      Notification.find({ userId: userId, read: true }).sort({ createdAt: -1 }),
    ])

    res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      data: {
        unreadCount: unread.length,
        unread,
        read,
      },
    })
  }
)
