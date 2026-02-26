/**
 * TEST ENDPOINT FOR SOCKET NOTIFICATIONS
 * 
 * Add this to your routes to easily test Socket.IO notifications
 * Route: POST /api/v1/test/notification
 */

import { Router } from 'express';
import { getSocketInstance } from '../helper/socketHelper';

const router = Router();

/**
 * Send test notification to a user via Socket.IO
 * @route POST /api/v1/test/notification
 * @body { userId: string, title?: string, message?: string }
 */
router.post('/notification', async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }

    const io = getSocketInstance();
    if (!io) {
      return res.status(500).json({ 
        success: false, 
        error: 'Socket.IO not initialized' 
      });
    }

    // Create test notification in Flutter's expected format
    const notification = {
      _id: new Date().getTime().toString(),
      to: userId,
      title: title || 'Test Notification',
      message: message || 'This is a test notification from the backend! 🎉',
      type: type || 'general',
      isViewed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Emit to user's room
    io.to(userId).emit('notification', notification);
    
    console.log(`📬 Test notification sent to ${userId}:`, notification.title);
    
    res.json({ 
      success: true, 
      message: 'Test notification sent successfully',
      notification,
      sentTo: userId
    });

  } catch (error: any) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Check if a user is connected to Socket.IO
 * @route GET /api/v1/test/socket-status/:userId
 */
router.get('/socket-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const io = getSocketInstance();
    
    if (!io) {
      return res.status(500).json({ 
        success: false, 
        error: 'Socket.IO not initialized' 
      });
    }

    // Get all sockets in the user's room
    const sockets = await io.in(userId).fetchSockets();
    
    res.json({
      success: true,
      userId,
      connected: sockets.length > 0,
      socketCount: sockets.length,
      socketIds: sockets.map(s => s.id),
      message: sockets.length > 0 
        ? `User ${userId} is connected with ${sockets.length} socket(s)` 
        : `User ${userId} is not connected`
    });

  } catch (error: any) {
    console.error('❌ Error checking socket status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Send test message to match chat room
 * @route POST /api/v1/test/chat-message
 * @body { matchId: string, message?: string }
 */
router.post('/chat-message', async (req, res) => {
  try {
    const { matchId, messageText } = req.body;
    
    if (!matchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'matchId is required' 
      });
    }

    const io = getSocketInstance();
    if (!io) {
      return res.status(500).json({ 
        success: false, 
        error: 'Socket.IO not initialized' 
      });
    }

    // Create test message
    const testMessage = {
      chatId: 'test-chat-id',
      message: {
        _id: new Date().getTime().toString(),
        text: messageText || 'This is a test message!',
        user: {
          _id: 'test-user-id',
          name: 'Test User',
          role: 'player',
        },
        date: new Date().toISOString(),
        read: false,
      }
    };

    // Emit to match room
    io.to(matchId).emit('newMessage', testMessage);
    
    console.log(`💬 Test message sent to match ${matchId}`);
    
    res.json({ 
      success: true, 
      message: 'Test message sent successfully',
      testMessage,
      sentToMatch: matchId
    });

  } catch (error: any) {
    console.error('❌ Error sending test message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
