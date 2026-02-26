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
import Match from "../match/match.model";
import { Chat } from "./chat.model";
import { sendChatMessageToMatch, createAndSendNotifications } from "../../helper/socketHelper";

export const createChat = catchAsycn(async (req, res) => {
  const { matchId } = req.body;
  
  if (!req.user || !req.user._id) {
    throw new AppError(401, "Unauthorized. Please login first.");
  }
  
  const userId = req.user._id;

  // Find the match and populate teams
  const match = await Match.findById(matchId).populate("teamOne teamTwo");
  if (!match) {
    throw new AppError(404, "Match not found");
  }

  // Teams are already populated from the match query
  const teamOne = match.teamOne as any;
  const teamTwo = match.teamTwo as any;

  if (!teamOne || !teamTwo) {
    throw new AppError(404, "Teams not found for this match");
  }

  // Verify that the requesting user belongs to one of the teams in this match
  const isUserInTeamOne = 
    teamOne.user?.toString() === userId.toString() || 
    teamOne.player?.toString() === userId.toString();
  
  const isUserInTeamTwo = 
    teamTwo.user?.toString() === userId.toString() || 
    teamTwo.player?.toString() === userId.toString();

  if (!isUserInTeamOne && !isUserInTeamTwo) {
    throw new AppError(
      403,
      "You are not authorized for this chat."
    );
  }

  // Check if chat already exists for this match
  let chat = await Chat.findOne({ match: matchId });

  if (!chat) {
    // Create chat with match reference
    chat = await Chat.create({
      name: `Match: ${teamOne.teamName} vs ${teamTwo.teamName}`,
      match: matchId,
      seller: teamOne._id,
      user: teamTwo._id,
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
  
  if (!req.user || !req.user._id) {
    throw new AppError(401, "Unauthorized. Please login first.");
  }
  
  const userId = req.user._id;

  const chat = await Chat.findById(chatId).populate("match");
  if (!chat) {
    throw new AppError(404, "Chat not found");
  }

  // Verify user belongs to one of the teams in the match
  if (chat.match) {
    const match = await Match.findById(chat.match).populate("teamOne teamTwo");
    if (!match) {
      throw new AppError(404, "Match not found for this chat");
    }

    // Teams are already populated from the match query
    const teamOne = match.teamOne as any;
    const teamTwo = match.teamTwo as any;

    if (!teamOne || !teamTwo) {
      throw new AppError(404, "Teams not found for this match");
    }

    // Check if user belongs to either team
    const isUserInTeamOne = 
      teamOne.user?.toString() === userId.toString() || 
      teamOne.player?.toString() === userId.toString();
    
    const isUserInTeamTwo = 
      teamTwo.user?.toString() === userId.toString() || 
      teamTwo.player?.toString() === userId.toString();

    if (!isUserInTeamOne && !isUserInTeamTwo) {
      throw new AppError(
        403,
        "You are not authorized to send messages in this chat. You must be a player in one of the teams."
      );
    }
  }

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
    .populate("messages.user", "name role profileImage"); // Populate sender of last message

  if (chat12?.messages[0] && chat.match) {
    // Send message to all users in the match room via Socket.IO
    sendChatMessageToMatch(chat.match, {
      chatId: chatId,
      message: chat12.messages[0],
    });

    // Get match and teams to notify all users
    const match = await Match.findById(chat.match).populate("teamOne teamTwo league");
    if (match) {
      const teamOne = match.teamOne as any;
      const teamTwo = match.teamTwo as any;
      const senderName = req.user.name || "A player";

      // Collect all user IDs from both teams (excluding the sender)
      const allUserIds = [
        teamOne?.user,
        teamOne?.player,
        teamTwo?.user,
        teamTwo?.player,
      ].filter((id) => id && id.toString() !== req.user._id.toString());

      if (allUserIds.length > 0) {
        const notificationMessage = `💬 New message from ${senderName} in ${teamOne.teamName} vs ${teamTwo.teamName} chat`;
        
        // Create notifications in DB and send via Socket.IO
        await createAndSendNotifications(allUserIds, notificationMessage, "success");
      }
    }
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

  const message = chat.messages.id(messageId) as any;
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
  
  if (!req.user || !req.user._id) {
    throw new AppError(401, "Unauthorized. Please login first.");
  }
  
  const userId = req.user._id;

  const chat = await Chat.findById(chatId)
    .populate("messages.user", "name role avatar")
    .populate("match");

  if (!chat) throw new AppError(404, "Chat not found");

  // Verify user belongs to one of the teams in the match
  if (chat.match) {
    const match = await Match.findById(chat.match).populate("teamOne teamTwo");
    if (!match) {
      throw new AppError(404, "Match not found for this chat");
    }

    // Teams are already populated from the match query
    const teamOne = match.teamOne as any;
    const teamTwo = match.teamTwo as any;

    if (!teamOne || !teamTwo) {
      throw new AppError(404, "Teams not found for this match");
    }

    // Check if user belongs to either team
    const isUserInTeamOne = 
      teamOne.user?.toString() === userId.toString() || 
      teamOne.player?.toString() === userId.toString();
    
    const isUserInTeamTwo = 
      teamTwo.user?.toString() === userId.toString() || 
      teamTwo.player?.toString() === userId.toString();

    if (!isUserInTeamOne && !isUserInTeamTwo) {
      throw new AppError(
        403,
        "You are not authorized to view this chat. You must be a player in one of the teams."
      );
    }
  }

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
