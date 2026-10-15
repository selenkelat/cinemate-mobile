import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.SubscriptionStatusDto field-for-field.
export interface SubscriptionStatusDto {
  isPremium: boolean;
  premiumExpiresAt: string | null;
}

export const subscriptionApi = {
  get: () => apiRequest<SubscriptionStatusDto>('/api/me/subscription', { auth: true }),
};
