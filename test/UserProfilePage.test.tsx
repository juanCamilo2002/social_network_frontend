import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserProfilePage } from '../src/features/users/pages/UserProfilePage';
import type { UserProfile } from '../src/features/users/types/user-profile.types';

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock('../src/features/auth/api/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    request: requestMock,
  }),
}));

vi.mock('../src/features/auth/context/auth-context', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
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

function renderProfile(initialPath = '/profile/juan_dev') {
  const router = createMemoryRouter(
    [
      {
        path: '/profile/:nickname',
        element: <UserProfilePage />,
      },
      {
        path: '/search',
        element: <p>Página de búsqueda</p>,
      },
    ],
    {
      initialEntries: [initialPath],
    },
  );

  const result = render(<RouterProvider router={router} />);

  return { ...result, router };
}

describe('UserProfilePage', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('muestra el estado de carga mientras espera la respuesta', () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    renderProfile();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando perfil');
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/users/by-nickname/juan_dev',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('muestra los datos públicos del perfil', async () => {
    requestMock.mockResolvedValue(profile);

    renderProfile();

    expect(
      await screen.findByRole('heading', { name: 'Juan Pérez' }),
    ).toBeInTheDocument();
    expect(screen.getByText('@juan_dev')).toBeInTheDocument();
    expect(screen.getByText('Hola, soy Juan.')).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /volver a buscar personas/i }),
    ).toHaveAttribute('href', '/search');
  });

  it('muestra un mensaje cuando el perfil no existe', async () => {
    requestMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    });

    renderProfile('/profile/desconocido');

    expect(
      await screen.findByRole('heading', { name: 'Perfil no encontrado' }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Editar perfil' }),
    ).not.toBeInTheDocument();
  });

  it('muestra un error y permite reintentar', async () => {
    requestMock
      .mockRejectedValueOnce(new Error('Error de red'))
      .mockResolvedValueOnce(profile);

    renderProfile();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar el perfil.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { name: 'Juan Pérez' }),
    ).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('cancela la petición al desmontar la página', () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderProfile();

    const config = requestMock.mock.calls[0][0] as {
      signal: AbortSignal;
    };

    expect(config.signal.aborted).toBe(false);

    unmount();

    expect(config.signal.aborted).toBe(true);
  });

  it('descarta la respuesta anterior al navegar a otro perfil', async () => {
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

    const { router } = renderProfile();

    const firstConfig = requestMock.mock.calls[0][0] as {
      signal: AbortSignal;
    };

    await act(async () => {
      await router.navigate('/profile/maria');
    });

    expect(firstConfig.signal.aborted).toBe(true);
    expect(
      await screen.findByRole('heading', { name: 'María López' }),
    ).toBeInTheDocument();

    // Simula una respuesta que llega a pesar de la cancelación.
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
