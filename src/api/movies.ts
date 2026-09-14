import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.WatchedMovieDto field-for-field.
export interface WatchedMovieDto {
  movieId: number;
  title: string;
  releaseYear: number | null;
}

export const moviesApi = {
  getWatched: () => apiRequest<WatchedMovieDto[]>('/api/me/movies/watched', { auth: true }),
};
