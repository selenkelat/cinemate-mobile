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
  mimeType?: string | null;
}

export const exportsApi = {
  upload: (file: PickedFile) => {
    const formData = new FormData();
    // React Native's FormData accepts this { uri, name, type } shape in place of a real Blob —
    // the native bridge reads the file at `uri` and streams it, it isn't loaded into JS memory.
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? 'application/zip',
    } as unknown as Blob);

    return apiRequest<UploadExportResponse>('/api/me/exports', {
      method: 'POST',
      body: formData,
      auth: true,
    });
  },
};
