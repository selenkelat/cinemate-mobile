import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.MovieSearchResultDto field-for-field. movieId is the TMDB id —
// exactly what sharedListApi.add takes.
export interface MovieSearchResultDto {
  movieId: number;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
}

// Mirrors Cinemate.Models.Dto.SharedListItemDto field-for-field.
export interface SharedListItemDto {
  movieId: number;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  addedByMe: boolean;
  addedAt: string;
}

// Mirrors Cinemate.Models.Dto.SharedListDto field-for-field. items is empty unless both sides
// are premium; the two flags say which side isn't.
export interface SharedListDto {
  callerIsPremium: boolean;
  otherIsPremium: boolean;
  isBlocked: boolean;
  items: SharedListItemDto[];
}

const listPath = (otherUserId: number) => `/api/me/conversations/${otherUserId}/list`;

export const sharedListApi = {
  get: (otherUserId: number) => apiRequest<SharedListDto>(listPath(otherUserId), { auth: true }),
  // Idempotent on the backend — adding a movie that's already listed just returns the list.
  add: (otherUserId: number, movieId: number) =>
    apiRequest<SharedListDto>(listPath(otherUserId), { method: 'POST', body: { movieId }, auth: true }),
  remove: (otherUserId: number, movieId: number) =>
    apiRequest<void>(`${listPath(otherUserId)}/${movieId}`, { method: 'DELETE', auth: true }),
  // Premium-only (403 otherwise); the backend 400s a query under 2 or over 100 characters.
  searchMovies: (query: string) =>
    apiRequest<MovieSearchResultDto[]>(`/api/movies/search?q=${encodeURIComponent(query)}`, { auth: true }),
};
