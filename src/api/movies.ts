import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.WatchedMovieDto field-for-field. Reused as-is for both watched and
// liked lists — same shape on the wire.
export interface WatchedMovieDto {
  movieId: number;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
}

export const moviesApi = {
  getWatched: () => apiRequest<WatchedMovieDto[]>('/api/me/movies/watched', { auth: true }),
  getLiked: () => apiRequest<WatchedMovieDto[]>('/api/me/movies/liked', { auth: true }),
};
