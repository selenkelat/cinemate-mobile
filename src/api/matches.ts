import { apiRequest, apiRequestWithHeaders } from '@/api/client';
import type { FavoriteMovieDto } from '@/api/profile';

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
  otherFavoriteMovies: FavoriteMovieDto[];
  overallScore: number;
  genreSimilarity: number;
  watchedOverlap: MovieOverlapDto;
  likedOverlap: MovieOverlapDto;
  ratingCorrelation: number | null;
  sharedRatedCount: number;
}

// The body stays a bare MatchCandidateDto[] (backend MatchController keeps it that way so older
// app builds don't break); premium status and the full pre-cap count ride on response headers.
// Both are null if the header is missing or malformed — callers then just skip any upsell UI.
export interface CandidatesResult {
  candidates: MatchCandidateDto[];
  isPremium: boolean | null;
  totalCount: number | null;
}

function parseIsPremium(value: string | null): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function parseCount(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export const matchesApi = {
  getCandidates: async (): Promise<CandidatesResult> => {
    const { data, headers } = await apiRequestWithHeaders<MatchCandidateDto[]>('/api/match/candidates', { auth: true });
    return {
      candidates: data,
      isPremium: parseIsPremium(headers.get('X-Is-Premium')),
      totalCount: parseCount(headers.get('X-Total-Candidates')),
    };
  },
  get: (otherUserId: number) => apiRequest<MatchResultDto>(`/api/match/${otherUserId}`, { auth: true }),
};
