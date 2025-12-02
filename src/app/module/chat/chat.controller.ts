// import AppError from "../errors/AppError.js";
// import { Chat } from "../model/chat.model.js";
// // import { Farm } from "../model/farm.model.js";
// import catchAsycn from "../utils/catchAsycn.js";
// import httpStatus from "http-status";
// import sendResponse from "../utils/sendResponse.ts";
// import { User } from "../model/user.model.js";
// import { io } from "../server.js";

import AppError from "../../error/appError";
import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import Team from "../team/team.model";
import User from "../user/user.model";
import { Chat } from "./chat.model";

export const createChat = catchAsycn(async (req, res) => {
  const { sellerId, userId } = req.body;
  const farm = await Team.findById(sellerId);
  if (!farm) {
    throw new AppError(404, "Seller not found");
  }
  let chat = await Chat.findOne({
    $or: [
      { seller: sellerId, user: userId },
      { seller: userId, user: sellerId },
    ],
  });
  if (!chat) {
    chat = await Chat.create({
      name: farm.teamName,
      seller: sellerId,
      user: userId,
    });
  }
  sendResponse(res, {
    statusCode: 200,
    message: "Chat created successfully",
    success: true,
    data: chat,
  });
});

export const sendMessage = catchAsycn(async (req, res) => {
  const { chatId, message } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(404, "Chat not found");
  }
  // if (
  //   chat.user?.toString() !== req.user._id.toString() &&
  //   chat?.seller?.toString() !== req.user._id.toString()
  // ) {
  //   throw new AppError(
  //     401,
  //     "You are not authorized to send message in this chat"
  //   );
  // }
  const messages = {
    text: message,
    user: req.user._id,
    date: new Date(),
    read: false,
  };
  chat.messages.push(messages);
  await chat.save();

  const chat12 = await Chat.findOne({ _id: chatId })
    .select({ messages: { $slice: -1 } }) // Only include last message
    .populate("messages.user", "name role avatar"); // Populate sender of last message

  if (chat12?.messages[0]) {
      // io.to(`chat_${chatId}`).emit("newMassage", chat12.messages[0]);
  }

  sendResponse(res, {
    statusCode: 200,
    message: "Message sent successfully",
    success: true,
    data: chat12?.messages[0],
  });
});

export const updateMessage = catchAsycn(async (req, res) => {
  const { chatId, messageId, newText } = req.body;

  const chat = await Chat.findById(chatId).populate(
    "messages.user",
    "name role avatar"
  );
  if (!chat) throw new AppError(404, "Chat not found");

  const message = chat.messages.id(messageId);
  if (!message) throw new AppError(404, "Message not found");

  // Optional: check if current user is the sender
  if (!message?.user?.equals(req.user._id)) {
    throw new AppError(403, "You can only edit your own messages");
  }

  message.text = newText;
  // io.to(`chat_${chatId}`).emit("newMassage", message);
  await chat.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Message updated successfully",
    data: message,
  });
});

export const deleteMessage = catchAsycn(async (req, res) => {
  const { chatId, messageId } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new AppError(404, "Chat not found");

  const message = chat.messages.id(messageId);
  if (!message) throw new AppError(404, "Message not found");

  // Optional: check if current user is the sender
  if (!message.user?.equals(req.user._id)) {
    throw new AppError(403, "You can only delete your own messages");
  }

  message.remove();
  await chat.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Message deleted successfully",
  });
});

export const getChatForUser = catchAsycn(async (req, res) => {
  const user = req.user._id;
  const chat = await Chat.find({ $or: [{ user: user }, { seller: user }] })
    .select({ messages: { $slice: -1 } }) // Only include last message
    .populate("messages.user", "name role avatar") // Populate sender of last message
    .sort({ updatedAt: -1 }); // Sort by last updated time
  sendResponse(res, {
    statusCode: 200,
    message: "Chat retrieved successfully",
    success: true,
    data: chat,
  });
});

export const getSingleChat = catchAsycn(async (req, res) => {
  const { chatId } = req.params;
  const chat = await Chat.findById(chatId).populate(
    "messages.user",
    "name role avatar"
  );
  if (!chat) throw new AppError(404, "Chat not found");
  sendResponse(res, {
    statusCode: 200,
    message: "Chat retrieved successfully",
    success: true,
    data: chat,
  });
});

export const getSingleChatWithScaduleId = catchAsycn(async (req, res) => {
  const { chatId } = req.params;
  const chat = await Chat.findOne({schedule:chatId}).populate(
    "messages.user",
    "name role avatar"
  );
  if (!chat) throw new AppError(404, "Chat not found");
  sendResponse(res, {
    statusCode: 200,
    message: "Chat retrieved successfully",
    success: true,
    data: chat,
  });
});

// export const getChatForFarm = catchAsycn(async (req, res) => {
//     const { farmId } = req.params
//     const chat = await Chat.find({ farm: farmId }).select({ messages: { $slice: -1 } }) // Only include last message
//         .populate("messages.user", "name role avatar") // Populate sender of last message
//         .sort({ updatedAt: -1 }); // Sort by last updated time
//     sendResponse(res, {
//         statusCode: 200,
//         message: "Chat retrieved successfully",
//         success: true,
//         data: chat
//     })
// })
