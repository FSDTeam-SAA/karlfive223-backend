import express from 'express'
import { getUserNotifications, markAllAsRead, markAsReadById } from './notification.controller'
import Auth from '../../middlewares/Auth'

const router = express.Router()

// Mark all notifications as read for logged-in user (must come BEFORE /read/:notificationId)
router.patch('/mark-all-as-read', Auth('user', 'admin', 'player'), markAllAsRead)

// Mark single notification as read by ID
router.patch('/read/:notificationId', Auth('user', 'admin', 'player'), markAsReadById)

// Get notifications for a user (must come LAST since it uses :userId parameter)
router.get('/:userId', getUserNotifications)

export const notificationRouter = router
