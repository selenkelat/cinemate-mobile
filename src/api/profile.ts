import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.UserProfileDto field-for-field.
export interface GenrePercentageDto {
  genre: string;
  count: number;
  percentage: number;
}

export interface RatingStatsDto {
  average: number | null;
  median: number | null;
  count: number;
}

export interface FavoriteMovieDto {
  movieId: number;
  title: string;
  rank: number;
  posterUrl: string | null;
}

export interface UserProfileDto {
  userId: number;
  genreProfile: GenrePercentageDto[];
  ratingStats: RatingStatsDto;
  watchedCount: number;
  ratedCount: number;
  likedCount: number;
  favoriteMovies: FavoriteMovieDto[];
  avatarUrl: string | null;
}

export const profileApi = {
  get: (userId: number) => apiRequest<UserProfileDto>(`/api/users/${userId}/profile`, { auth: true }),
};
