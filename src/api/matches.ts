import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.MatchCandidateDto field-for-field.
export interface MatchCandidateDto {
  userId: number;
  username: string;
  displayName: string;
  overallScore: number;
  watchedOverlapCount: number;
}

// Mirrors Cinemate.Models.Dto.MovieOverlapDto field-for-field.
export interface MovieOverlapDto {
  count: number;
  titles: string[];
}

// Mirrors Cinemate.Models.Dto.MatchResultDto field-for-field.
export interface MatchResultDto {
  user1Id: number;
  user2Id: number;
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
