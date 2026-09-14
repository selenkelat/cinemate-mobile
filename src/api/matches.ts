import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.CandidateFavoriteMovieDto field-for-field.
export interface CandidateFavoriteMovieDto {
  movieId: number;
  title: string;
  posterUrl: string | null;
}

// Mirrors Cinemate.Models.Dto.MatchCandidateDto field-for-field.
export interface MatchCandidateDto {
  userId: number;
  username: string;
  displayName: string;
  overallScore: number;
  watchedOverlapCount: number;
  favoriteMovies: CandidateFavoriteMovieDto[];
  topGenres: string[];
  avatarUrl: string | null;
}

// Mirrors Cinemate.Models.Dto.OverlapMovieDto field-for-field.
export interface OverlapMovieDto {
  movieId: number;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
}

// Mirrors Cinemate.Models.Dto.MovieOverlapDto field-for-field.
export interface MovieOverlapDto {
  count: number;
  movies: OverlapMovieDto[];
}

// Mirrors Cinemate.Models.Dto.MatchResultDto field-for-field.
export interface MatchResultDto {
  user1Id: number;
  user2Id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  overallScore: number;
  genreSimilarity: number;
  watchedOverlap: MovieOverlapDto;
  likedOverlap: MovieOverlapDto;
  favoriteOverlap: MovieOverlapDto;
  ratingCorrelation: number | null;
  sharedRatedCount: number;
}

export const matchesApi = {
  getCandidates: () => apiRequest<MatchCandidateDto[]>('/api/match/candidates', { auth: true }),
  get: (otherUserId: number) => apiRequest<MatchResultDto>(`/api/match/${otherUserId}`, { auth: true }),
};
