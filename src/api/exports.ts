import { apiRequest } from '@/api/client';

// Mirrors Cinemate.Models.Dto.UploadExportResponseDto field-for-field.
export interface UploadExportResponse {
  uploadId: number;
  watchedCount: number;
  ratedCount: number;
  likedCount: number;
  newMoviesResolved: number;
  unresolvedTitles: string[];
}

interface PickedFile {
  uri: string;
  name: string;
}

export const exportsApi = {
  upload: async (file: PickedFile) => {
    // NOT the classic RN `{ uri, name, type }` FormData part — Expo SDK 57's global `fetch` is
    // its own WinterCG-compliant implementation (expo/src/winter/fetch), which only accepts a
    // real Blob for a file part (see convertFormData.ts: "`uri` is not supported for React
    // Native's FormData"). Fetching the local file:// URI and reading it as a Blob is the
    // supported path — it goes through Expo's native blob store, not through JS memory.
    const fileResponse = await fetch(file.uri);
    const blob = await fileResponse.blob();

    const formData = new FormData();
    formData.append('file', blob, file.name);

    return apiRequest<UploadExportResponse>('/api/me/exports', {
      method: 'POST',
      body: formData,
      auth: true,
    });
  },
};
