import { isAxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { useCallback } from 'react';

import { apiClient } from '../../../shared/api/client';
import { useAuth } from '../context/auth-context';
import { isTokenUsable, readRawStoredToken } from '../utils/token';

export function useAuthenticatedApi() {
  const { accessToken, signOut } = useAuth();

  const request = useCallback(
    async function request<T>(config: AxiosRequestConfig): Promise<T> {
      const token = accessToken;

      if (!token) {
        throw new Error('No hay una sesión activa');
      }

      if (readRawStoredToken() !== token) {
        throw new Error('La sesión cambió. Vuelve a intentarlo');
      }

      if (!isTokenUsable(token)) {
        signOut();
        throw new Error('La sesión ha expirado');
      }

      const apiUrl = apiClient.defaults.baseURL;

      if (!apiUrl) {
        throw new Error('La URL de la API no está configurada');
      }

      const apiOrigin = new URL(apiUrl, window.location.href).origin;
      const requestUrl = new URL(
        apiClient.getUri(config),
        window.location.href,
      );

      if (requestUrl.origin !== apiOrigin) {
        throw new Error(
          'No se permite enviar el token a un origen diferente de la API',
        );
      }

      const headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };

      try {
        const response = await apiClient.request<T>({ ...config, headers });

        return response.data;
      } catch (error: unknown) {
        if (
          isAxiosError(error) &&
          error.response?.status === 401 &&
          readRawStoredToken() === token
        ) {
          signOut();
        }

        throw error;
      }
    },
    [accessToken, signOut],
  );

  return { request };
}
