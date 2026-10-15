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

// Mirrors Cinemate.Models.Dto.WatchRecommendationsDto field-for-field. Premium-only (403 for a
// free caller); each list is already in display order, highest-rated first.
export interface WatchRecommendationsDto {
  forYou: MovieOverlapDto;
  forThem: MovieOverlapDto;
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
  // minScore is the Premium "only X%+" filter — the backend 403s it for a free caller and 400s
  // anything below its chat threshold or above 100. Omit it for the default list.
  getCandidates: async (minScore?: number): Promise<CandidatesResult> => {
    const path = minScore === undefined ? '/api/match/candidates' : `/api/match/candidates?minScore=${minScore}`;
    const { data, headers } = await apiRequestWithHeaders<MatchCandidateDto[]>(path, { auth: true });
    return {
      candidates: data,
      isPremium: parseIsPremium(headers.get('X-Is-Premium')),
      totalCount: parseCount(headers.get('X-Total-Candidates')),
    };
  },
  get: (otherUserId: number) => apiRequest<MatchResultDto>(`/api/match/${otherUserId}`, { auth: true }),
  getRecommendations: (otherUserId: number) =>
    apiRequest<WatchRecommendationsDto>(`/api/match/${otherUserId}/recommendations`, { auth: true }),
};
