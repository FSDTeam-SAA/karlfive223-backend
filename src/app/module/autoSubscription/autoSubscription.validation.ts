/**
 * Auto-Subscription Request Validation
 */

export const autoSubscriptionValidation = {
  // Enable auto-subscription validation
  enableAutoSubscription: {
    required: ['userId', 'plan', 'paymentMethodId'],
    body: {
      userId: { type: 'string', required: true, description: 'MongoDB User ID' },
      plan: { type: 'string', enum: ['basic', 'gold', 'club'], description: 'Subscription plan' },
      paymentMethodId: { type: 'string', required: true, description: 'Stripe Payment Method ID' },
    },
    example: {
      userId: '507f1f77bcf86cd799439011',
      plan: 'gold',
      paymentMethodId: 'pm_1234567890abcdefghijklmn',
    },
  },

  // Cancel auto-subscription validation
  cancelAutoSubscription: {
    required: ['userId'],
    body: {
      userId: { type: 'string', required: true, description: 'MongoDB User ID' },
      reason: { type: 'string', description: 'Optional cancellation reason' },
    },
    example: {
      userId: '507f1f77bcf86cd799439011',
      reason: 'Too expensive',
    },
  },

  // Update payment method validation
  updatePaymentMethod: {
    required: ['userId', 'paymentMethodId'],
    body: {
      userId: { type: 'string', required: true, description: 'MongoDB User ID' },
      paymentMethodId: { type: 'string', required: true, description: 'New Stripe Payment Method ID' },
    },
    example: {
      userId: '507f1f77bcf86cd799439011',
      paymentMethodId: 'pm_9876543210zyxwvutsrqponm',
    },
  },
};
