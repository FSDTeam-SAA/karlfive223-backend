import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { Notification } from "./notification.model";
import AppError from "../../error/appError";

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

  // Verify the notification belongs to the requesting user
  if (notification.userId.toString() !== userId) {
    throw new AppError(403, "You are not authorized to modify this notification");
  }

  // Mark as read
  notification.read = true;
  await notification.save();

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
    
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { userId: userId, read: false },  // Only update unread ones
      { $set: { read: true } }          // Use $set operator
    );
    
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
