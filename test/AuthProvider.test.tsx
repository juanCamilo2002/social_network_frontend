import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { login } from '../src/features/auth/api/auth.api';
import { AuthProvider } from '../src/features/auth/context/AuthProvider';
import { useAuth } from '../src/features/auth/context/auth-context';
import { saveToken } from '../src/features/auth/utils/token';

vi.mock('../src/features/auth/api/auth.api', () => ({
  login: vi.fn(),
}));

const TOKEN_KEY = 'social_network_access_token';

function makeToken(expiresAt: number): string {
  return `header.${btoa(JSON.stringify({ exp: expiresAt }))}.signature`;
}

function renderAuth() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  return renderHook(() => useAuth(), { wrapper });
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('restaura una sesión vigente', () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 900);
    saveToken(token);

    const { result } = renderAuth();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe(token);
  });

  it.each([
    ['vencido', () => makeToken(Math.floor(Date.now() / 1000) - 1)],
    ['malformado', () => 'invalid-token'],
  ])(
    'ignora un token %s al restaurar la sesión',
    (_description, createToken) => {
      saveToken(createToken());

      const { result } = renderAuth();

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();
    },
  );

  it('guarda el token al iniciar sesión y lo elimina al cerrarla', async () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 900);
    vi.mocked(login).mockResolvedValue({ accessToken: token });
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signIn({
        email: 'juan@example.com',
        password: 'clave',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);

    act(() => result.current.signOut());

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('una respuesta 401 del login no elimina una sesión existente', async () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 900);
    saveToken(token);
    const unauthorized = { isAxiosError: true, response: { status: 401 } };
    vi.mocked(login).mockRejectedValue(unauthorized);
    const { result } = renderAuth();

    await act(async () => {
      await expect(
        result.current.signIn({
          email: 'juan@example.com',
          password: 'incorrecta',
        }),
      ).rejects.toBe(unauthorized);
    });

    expect(result.current.accessToken).toBe(token);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
  });

  it('cierra la sesión cuando el token expira', () => {
    vi.useFakeTimers();
    const token = makeToken(Math.floor(Date.now() / 1000) + 60);
    saveToken(token);
    const { result } = renderAuth();

    act(() => vi.advanceTimersByTime(61_000));

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('sincroniza el inicio y cierre de sesión desde otra pestaña', () => {
    const { result } = renderAuth();
    const token = makeToken(Math.floor(Date.now() / 1000) + 900);

    act(() => {
      saveToken(token);
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY }));
    });
    expect(result.current.accessToken).toBe(token);

    act(() => {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY }));
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('no elimina una sesión nueva cuando vence un temporizador anterior', () => {
    vi.useFakeTimers();
    const now = Math.floor(Date.now() / 1000);
    const oldToken = makeToken(now + 60);
    const newToken = makeToken(now + 900);
    saveToken(oldToken);
    const { result } = renderAuth();

    // Simula que otra pestaña escribió el token antes de recibir su evento.
    saveToken(newToken);
    act(() => vi.advanceTimersByTime(61_000));

    expect(localStorage.getItem(TOKEN_KEY)).toBe(newToken);
    expect(result.current.accessToken).toBe(newToken);
  });
});
