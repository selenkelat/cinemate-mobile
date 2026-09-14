import { apiRequest } from '@/api/client';
import type { FavoriteMovieDto } from '@/api/profile';

export const favoritesApi = {
  // Replace-all, mirroring FavoritesService.SetFavoritesAsync: every call rewrites the full set.
  set: (movieIds: number[]) =>
    apiRequest<FavoriteMovieDto[]>('/api/me/favorites', { method: 'POST', body: { movieIds }, auth: true }),
};
