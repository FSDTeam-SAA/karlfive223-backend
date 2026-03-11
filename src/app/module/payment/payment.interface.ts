import { Types } from 'mongoose'

export interface IPayment {
  userId: Types.ObjectId
  league: Types.ObjectId
  team: Types.ObjectId
  amount: number
  status: 'pending' | 'success' | 'failed'
  transactionId: string
  type: 'subscription' | 'league'
  /** Which plan was purchased — only populated when type === 'subscription' */
  subscriptionPlan?: 'free' | 'basic' | 'gold' | 'club'
  expiryDate?: Date
  createdAt?: Date
  updatedAt?: Date
}
