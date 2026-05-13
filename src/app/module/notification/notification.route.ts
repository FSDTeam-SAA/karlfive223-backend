import express from 'express'
import auth from '../../middlewares/Auth'
import { userrole } from '../user/user.constent'
import { customNotification, getUserNotifications, markAllAsRead, markAsReadById } from './notification.controller'

const router = express.Router()

// Mark all notifications as read for logged-in user (must come BEFORE /read/:notificationId)
router.patch('/mark-all-as-read', auth(userrole.player, userrole.admin), markAllAsRead)

// Mark single notification as read by ID
router.patch('/read/:notificationId', auth(userrole.player, userrole.admin), markAsReadById)

// Get notifications for a user (must come LAST since it uses :userId parameter)
router.get('/:userId', getUserNotifications)

router.post("/send-notification", customNotification)

export const notificationRouter = router
