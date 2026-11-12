import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersSearchPage } from '../src/features/users/pages/UsersSearchPage';
import type { UserSearchResult } from '../src/features/users/types/user-search.types';

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

const user: UserSearchResult = {
  id: 'user-1',
  nickname: 'juan_dev',
  name: 'Juan',
  lastName: 'Pérez',
  profilePicture: null,
};

function changeQuery(value: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar usuarios' }), {
    target: { value },
  });
}

async function advanceTime(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

describe('UsersSearchPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    requestMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('no consulta con menos de dos caracteres después de quitar espacios', async () => {
    render(<UsersSearchPage />);

    changeQuery(' a ');
    await advanceTime(500);

    expect(requestMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('espera 350 ms desde el último cambio y envía la búsqueda normalizada', async () => {
    requestMock.mockResolvedValue([]);

    render(<UsersSearchPage />);

    changeQuery('ju');
    await advanceTime(300);

    expect(requestMock).not.toHaveBeenCalled();

    changeQuery('  juan  ');
    await advanceTime(349);

    expect(requestMock).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Buscando personas');

    await advanceTime(1);

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/users/search',
        params: { q: 'juan' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('muestra los resultados recibidos', async () => {
    requestMock.mockResolvedValue([user]);

    render(<UsersSearchPage />);

    changeQuery('juan');
    await advanceTime(350);

    expect(
      screen.getByRole('heading', { name: 'Resultados' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('@juan_dev')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay resultados', async () => {
    requestMock.mockResolvedValue([]);

    render(<UsersSearchPage />);

    changeQuery('nadie');
    await advanceTime(350);

    expect(screen.getByRole('status')).toHaveTextContent(
      'No encontramos personas para esta búsqueda.',
    );
  });

  it('muestra el error y permite reintentar', async () => {
    requestMock
      .mockRejectedValueOnce(new Error('Error de red'))
      .mockResolvedValueOnce([user]);

    render(<UsersSearchPage />);

    changeQuery('juan');
    await advanceTime(350);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No fue posible realizar la búsqueda.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByRole('status')).toHaveTextContent('Buscando personas');

    await advanceTime(350);

    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('@juan_dev')).toBeInTheDocument();
  });

  it('cancela la búsqueda anterior y descarta su respuesta tardía', async () => {
    let resolveFirst!: (users: UserSearchResult[]) => void;

    const firstResponse = new Promise<UserSearchResult[]>((resolve) => {
      resolveFirst = resolve;
    });

    const secondUser: UserSearchResult = {
      id: 'user-2',
      nickname: 'maria',
      name: 'María',
      lastName: 'López',
      profilePicture: null,
    };

    requestMock
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce([secondUser]);

    render(<UsersSearchPage />);

    changeQuery('juan');
    await advanceTime(350);

    const firstConfig = requestMock.mock.calls[0][0] as {
      signal: AbortSignal;
    };

    expect(firstConfig.signal.aborted).toBe(false);

    changeQuery('maria');

    expect(firstConfig.signal.aborted).toBe(true);

    await advanceTime(350);

    expect(screen.getByText('@maria')).toBeInTheDocument();

    // Simula un cliente que entrega la respuesta aunque se haya cancelado.
    await act(async () => {
      resolveFirst([user]);
      await firstResponse;
    });

    expect(screen.getByText('@maria')).toBeInTheDocument();
    expect(screen.queryByText('@juan_dev')).not.toBeInTheDocument();
  });

  it('cancela la petición al desmontar la página', async () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(<UsersSearchPage />);

    changeQuery('juan');
    await advanceTime(350);

    const config = requestMock.mock.calls[0][0] as {
      signal: AbortSignal;
    };

    expect(config.signal.aborted).toBe(false);

    unmount();

    expect(config.signal.aborted).toBe(true);
  });
});
