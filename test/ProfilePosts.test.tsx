import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfilePosts } from '../src/features/posts/components/ProfilePosts';
import type { Post } from '../src/features/posts/types/post.types';

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock('../src/features/auth/api/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    request: requestMock,
  }),
}));

const post: Post = {
  id: 'post-1',
  authorId: 'user-1',
  content: 'Una publicación del perfil',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  author: {
    id: 'user-1',
    nickname: 'juan_dev',
    profilePicture: null,
  },
};

describe('ProfilePosts', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra carga y consulta las publicaciones del autor', () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    render(<ProfilePosts authorId="user-1" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando publicaciones',
    );

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/posts',
        params: { authorId: 'user-1' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('muestra las publicaciones recibidas', async () => {
    requestMock.mockResolvedValue([post]);

    render(<ProfilePosts authorId="user-1" />);

    expect(
      await screen.findByText('Una publicación del perfil'),
    ).toBeInTheDocument();

    expect(screen.getByText('@juan_dev')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando el perfil no tiene publicaciones', async () => {
    requestMock.mockResolvedValue([]);

    render(<ProfilePosts authorId="user-1" />);

    expect(
      await screen.findByText('Este perfil aún no tiene publicaciones.'),
    ).toBeInTheDocument();
  });

  it('permite reintentar cuando falla la consulta', async () => {
    requestMock
      .mockRejectedValueOnce(new Error('Error de red'))
      .mockResolvedValueOnce([post]);

    const user = userEvent.setup();

    render(<ProfilePosts authorId="user-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar las publicaciones.',
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByText('Una publicación del perfil'),
    ).toBeInTheDocument();

    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('cancela la petición al desmontarse', async () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(<ProfilePosts authorId="user-1" />);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
    });

    const config = requestMock.mock.calls[0][0] as {
      signal: AbortSignal;
    };

    expect(config.signal.aborted).toBe(false);

    unmount();

    expect(config.signal.aborted).toBe(true);
  });
});
