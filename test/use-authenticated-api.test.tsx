import { act, renderHook } from '@testing-library/react';
import { AxiosHeaders } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthenticatedApi } from '../src/features/auth/api/use-authenticated-api';
import { AuthProvider } from '../src/features/auth/context/AuthProvider';
import {
  AuthContext,
  useAuth,
} from '../src/features/auth/context/auth-context';
import { saveToken } from '../src/features/auth/utils/token';
import { apiClient } from '../src/shared/api/client';

vi.mock('../src/shared/api/client', async () => {
  const { default: axios } = await import('axios');

  return {
    apiClient: axios.create({ baseURL: 'http://api.example.test' }),
  };
});

function makeToken(expiresAt: number): string {
  return `header.${btoa(JSON.stringify({ exp: expiresAt }))}.signature`;
}

function renderAuthenticatedApi(accessToken: string | null) {
  const signOut = vi.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: accessToken !== null,
        signIn: vi.fn(),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );

  const hook = renderHook(() => useAuthenticatedApi(), { wrapper });

  return { ...hook, signOut };
}

describe('useAuthenticatedApi', () => {
  let token: string;

  beforeEach(() => {
    localStorage.clear();
    token = makeToken(Math.floor(Date.now() / 1000) + 900);
    saveToken(token);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('envía el token a la API y devuelve los datos', async () => {
    const send = vi.spyOn(apiClient, 'request').mockResolvedValue({
      data: [{ id: 'post-1' }],
    });
    const { result } = renderAuthenticatedApi(token);

    await expect(
      result.current.request({ method: 'GET', url: '/posts' }),
    ).resolves.toEqual([{ id: 'post-1' }]);

    const config = send.mock.calls[0][0] as AxiosRequestConfig;
    expect(AxiosHeaders.from(config.headers).get('Authorization')).toBe(
      `Bearer ${token}`,
    );
  });

  it('no envía el token a un origen diferente', async () => {
    const send = vi.spyOn(apiClient, 'request');
    const { result } = renderAuthenticatedApi(token);

    await expect(
      result.current.request({ url: 'https://other.example/posts' }),
    ).rejects.toThrow('origen diferente');
    expect(send).not.toHaveBeenCalled();
  });

  it('rechaza cambiar la URL base a otro origen', async () => {
    const send = vi.spyOn(apiClient, 'request');
    const { result } = renderAuthenticatedApi(token);

    await expect(
      result.current.request({
        baseURL: 'https://other.example',
        url: '/posts',
      }),
    ).rejects.toThrow('origen diferente');
    expect(send).not.toHaveBeenCalled();
  });

  it('rechaza peticiones sin sesión', async () => {
    const send = vi.spyOn(apiClient, 'request');
    const { result } = renderAuthenticatedApi(null);

    await expect(result.current.request({ url: '/posts' })).rejects.toThrow(
      'No hay una sesión activa',
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('rechaza un token expirado y cierra la sesión', async () => {
    const expired = makeToken(Math.floor(Date.now() / 1000) - 1);
    saveToken(expired);
    const send = vi.spyOn(apiClient, 'request');
    const { result, signOut } = renderAuthenticatedApi(expired);

    await expect(result.current.request({ url: '/posts' })).rejects.toThrow(
      'La sesión ha expirado',
    );
    expect(signOut).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });

  it('cierra la sesión ante un 401 de la sesión actual', async () => {
    const unauthorized = { isAxiosError: true, response: { status: 401 } };
    vi.spyOn(apiClient, 'request').mockRejectedValue(unauthorized);
    const { result, signOut } = renderAuthenticatedApi(token);

    await expect(result.current.request({ url: '/posts' })).rejects.toBe(
      unauthorized,
    );
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('un 401 autenticado limpia el contexto y el almacenamiento', async () => {
    const unauthorized = { isAxiosError: true, response: { status: 401 } };
    vi.spyOn(apiClient, 'request').mockRejectedValue(unauthorized);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(
      () => ({ auth: useAuth(), api: useAuthenticatedApi() }),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.api.request({ url: '/posts' })).rejects.toBe(
        unauthorized,
      );
    });

    expect(result.current.auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem('social_network_access_token')).toBeNull();
  });

  it('no cierra la sesión ante un error distinto de 401', async () => {
    const failure = { isAxiosError: true, response: { status: 500 } };
    vi.spyOn(apiClient, 'request').mockRejectedValue(failure);
    const { result, signOut } = renderAuthenticatedApi(token);

    await expect(result.current.request({ url: '/posts' })).rejects.toBe(
      failure,
    );
    expect(signOut).not.toHaveBeenCalled();
  });

  it('no cierra una sesión nueva por el 401 de una petición anterior', async () => {
    let rejectRequest!: (reason: unknown) => void;
    const pendingRequest = new Promise((_, reject) => {
      rejectRequest = reject;
    });
    vi.spyOn(apiClient, 'request').mockReturnValueOnce(pendingRequest);
    const { result, signOut } = renderAuthenticatedApi(token);

    const request = result.current.request({ url: '/posts' });
    const newerToken = makeToken(Math.floor(Date.now() / 1000) + 1800);
    saveToken(newerToken);
    const unauthorized = { isAxiosError: true, response: { status: 401 } };
    rejectRequest(unauthorized);

    await expect(request).rejects.toBe(unauthorized);
    expect(signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem('social_network_access_token')).toBe(
      newerToken,
    );
  });
});
