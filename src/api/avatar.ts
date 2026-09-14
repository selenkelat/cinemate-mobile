import { apiRequest } from '@/api/client';

interface PickedFile {
  uri: string;
  name: string;
}

export const avatarApi = {
  upload: async (file: PickedFile) => {
    // Same Blob conversion as exportsApi.upload — Expo SDK 57's global fetch only accepts a
    // real Blob for a multipart file part, not the classic RN { uri, name, type } shape.
    const fileResponse = await fetch(file.uri);
    const blob = await fileResponse.blob();

    const formData = new FormData();
    formData.append('file', blob, file.name);

    return apiRequest<{ avatarUrl: string }>('/api/me/avatar', {
      method: 'POST',
      body: formData,
      auth: true,
    });
  },

  remove: () => apiRequest<void>('/api/me/avatar', { method: 'DELETE', auth: true }),
};
