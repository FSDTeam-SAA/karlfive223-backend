import express from 'express'
import { getUserNotifications, markAllAsRead, markAsReadById } from './notification.controller'
import Auth from '../../middlewares/Auth'

const router = express.Router()

// Get notifications for a user
router.get('/:userId', getUserNotifications)

// Mark single notification as read by ID
router.patch('/read/:notificationId', Auth('user', 'admin', 'player'), markAsReadById)

// Mark all notifications as read for logged-in user
router.patch('/mark-all-as-read', Auth('user', 'admin', 'player'), markAllAsRead)

export const notificationRouter = router
