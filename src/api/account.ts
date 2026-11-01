import { apiRequest } from '@/api/client';

// Matches Cinemate.Controllers.AccountController. 204 on success; a wrong password is 403
// (not 401, which apiRequest would treat as an expired session and refresh-and-retry).
export const accountApi = {
  delete: (password: string) =>
    apiRequest<void>('/api/me/account/delete', { method: 'POST', body: { password }, auth: true }),
};
