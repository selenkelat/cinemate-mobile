import { apiRequest } from '@/api/client';
import type { AuthResponse, LoginRequest, RefreshRequest, RegisterRequest } from '@/api/types';

// Matches Cinemate.Controllers.AuthController — none of these take `auth: true`, since
// POST /api/auth/* is the one route group the backend never requires [Authorize] on.
export const authApi = {
  register: (body: RegisterRequest) =>
    apiRequest<AuthResponse>('/api/auth/register', { method: 'POST', body }),
  login: (body: LoginRequest) => apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', body }),
  refresh: (body: RefreshRequest) =>
    apiRequest<AuthResponse>('/api/auth/refresh', { method: 'POST', body }),
  logout: (body: RefreshRequest) => apiRequest<void>('/api/auth/logout', { method: 'POST', body }),
};
