import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { Notification } from "./notification.model";


export const markAllAsRead = catchAsycn(async(req,res)=>{
    const userId = req.user?.id;
    // const allNotifications = await Notification.find({user:userId});
    await Notification.updateMany({userId:userId},{read:true});
    sendResponse(res,{
        statusCode: 200,
        message: "All notifications marked as read",
        success: true,
        data: ""
    })   
})

export const getAllNotification = catchAsycn(async(req,res)=>{
    const userId = req.user?.id;
    const allNotifications = await Notification.find({userId:userId}).sort({createdAt:-1});
    sendResponse(res,{
        statusCode: 200,
        message: "All notifications",
        success: true,
        data: allNotifications
        })
})