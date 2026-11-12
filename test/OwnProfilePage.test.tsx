import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OwnProfilePage } from '../src/features/users/pages/OwnProfilePage';
import type { UserProfile } from '../src/features/users/types/user-profile.types';

const { requestMock, session } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  session: { accessToken: 'token-1' },
}));

vi.mock('../src/features/auth/api/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    request: requestMock,
  }),
}));

vi.mock('../src/features/auth/context/auth-context', () => ({
  useAuth: () => ({
    accessToken: session.accessToken,
  }),
}));

const profile: UserProfile = {
  id: 'user-1',
  nickname: 'juan_dev',
  name: 'Juan',
  lastName: 'Pérez',
  profilePicture: null,
  banner: null,
  biography: 'Hola, soy Juan.',
};

function renderOwnProfile() {
  return render(
    <MemoryRouter>
      <OwnProfilePage />
    </MemoryRouter>,
  );
}

describe('OwnProfilePage', () => {
  beforeEach(() => {
    requestMock.mockReset();
    session.accessToken = 'token-1';
  });

  it('consulta el perfil propio y muestra el estado de carga', () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    renderOwnProfile();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu perfil');

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/users/me',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('muestra los datos del perfil recibido', async () => {
    requestMock.mockResolvedValue(profile);

    renderOwnProfile();

    expect(
      await screen.findByRole('heading', { name: 'Juan Pérez' }),
    ).toBeInTheDocument();

    expect(screen.getByText('@juan_dev')).toBeInTheDocument();
    expect(screen.getByText('Hola, soy Juan.')).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /volver al inicio/i }),
    ).toHaveAttribute('href', '/');
  });

  it('muestra un mensaje cuando el usuario de la sesión no existe', async () => {
    requestMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    });

    renderOwnProfile();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos el usuario de esta sesión.',
    );

    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();
  });

  it('muestra un error y permite reintentar', async () => {
    requestMock
      .mockRejectedValueOnce(new Error('Error de red'))
      .mockResolvedValueOnce(profile);

    renderOwnProfile();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar tu perfil.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { name: 'Juan Pérez' }),
    ).toBeInTheDocument();

    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('cancela la petición al desmontar la página', () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderOwnProfile();

    const config = requestMock.mock.calls[0][0] as {
      signal: AbortSignal;
    };

    expect(config.signal.aborted).toBe(false);

    unmount();

    expect(config.signal.aborted).toBe(true);
  });

  it('descarta la respuesta anterior cuando cambia la sesión', async () => {
    let resolveFirst!: (value: UserProfile) => void;

    const firstResponse = new Promise<UserProfile>((resolve) => {
      resolveFirst = resolve;
    });

    const secondProfile: UserProfile = {
      id: 'user-2',
      nickname: 'maria',
      name: 'María',
      lastName: 'López',
      profilePicture: null,
      banner: null,
      biography: null,
    };

    requestMock
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(secondProfile);

    const { rerender } = renderOwnProfile();

    const firstConfig = requestMock.mock.calls[0][0] as {
      signal: AbortSignal;
    };

    session.accessToken = 'token-2';

    rerender(
      <MemoryRouter>
        <OwnProfilePage />
      </MemoryRouter>,
    );

    expect(firstConfig.signal.aborted).toBe(true);

    expect(
      await screen.findByRole('heading', { name: 'María López' }),
    ).toBeInTheDocument();

    // Simula una respuesta que llega aunque la petición fue cancelada.
    await act(async () => {
      resolveFirst(profile);
      await firstResponse;
    });

    expect(
      screen.getByRole('heading', { name: 'María López' }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('heading', { name: 'Juan Pérez' }),
    ).not.toBeInTheDocument();
  });
});
