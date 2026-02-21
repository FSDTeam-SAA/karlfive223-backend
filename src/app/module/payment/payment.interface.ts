import { Types } from 'mongoose'

export interface IPayment {
  userId: Types.ObjectId
  league: Types.ObjectId
  team: Types.ObjectId
  amount: number
  status: 'pending' | 'success' | 'failed'
  transactionId: string
  type: string
  expiryDate?: Date
}
