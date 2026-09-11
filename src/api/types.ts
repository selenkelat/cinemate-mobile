// Mirrors Cinemate.Models.Dto (AuthDtos.cs, UserDtos.cs) field-for-field. Keep these two in sync
// by hand — there's no shared schema between the C# backend and this app.

export interface RegisterRequest {
  username: string;
  password: string;
  displayName: string;
  letterboxdUsername?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface UserDto {
  id: number;
  username: string;
  displayName: string;
  letterboxdUsername: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: UserDto;
}
