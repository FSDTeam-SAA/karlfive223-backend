import { Schema, model, Types } from 'mongoose'
import { INotification } from './notifications.interface'

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['success', 'error', 'warning'], default: 'success' },
  read: { type: Boolean, default: false },
},
{
    timestamps: true,
})

export const Notification = model<INotification>('Notification', NotificationSchema)
