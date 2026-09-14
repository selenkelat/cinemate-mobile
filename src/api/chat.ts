import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.ConversationSummaryDto field-for-field.
export interface ConversationSummaryDto {
  otherUserId: number;
  otherUsername: string;
  otherDisplayName: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  isBlocked: boolean;
  blockedByMe: boolean;
  unreadCount: number;
  otherLastReadMessageId: number | null;
}

// Mirrors Cinemate.Models.Dto.MessageDto field-for-field. Also the shape of every WebSocket
// frame the server sends (echo to sender, live push to the peer) — there is no other frame type.
export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  body: string;
  sentAt: string;
}

export interface ConversationBlockDto {
  isBlocked: boolean;
  blockedByMe: boolean;
}

export interface ConversationReadDto {
  lastReadMessageId: number | null;
  unreadCount: number;
}

export const chatApi = {
  getConversations: () => apiRequest<ConversationSummaryDto[]>('/api/me/conversations', { auth: true }),

  getMessages: (otherUserId: number, beforeMessageId?: number, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeMessageId !== undefined) params.set('beforeMessageId', String(beforeMessageId));
    return apiRequest<MessageDto[]>(`/api/me/conversations/${otherUserId}/messages?${params}`, { auth: true });
  },

  block: (otherUserId: number) =>
    apiRequest<ConversationBlockDto>(`/api/me/conversations/${otherUserId}/block`, { method: 'POST', auth: true }),

  unblock: (otherUserId: number) =>
    apiRequest<ConversationBlockDto>(`/api/me/conversations/${otherUserId}/block`, { method: 'DELETE', auth: true }),

  markRead: (otherUserId: number, upToMessageId?: number) =>
    apiRequest<ConversationReadDto>(`/api/me/conversations/${otherUserId}/read`, {
      method: 'POST',
      body: { upToMessageId: upToMessageId ?? null },
      auth: true,
    }),
};
