import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PostsFeed } from '../src/features/posts/components/PostsFeed';

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock('../src/features/auth/api/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    request: requestMock,
  }),
}));

const post = {
  id: 'post-1',
  authorId: 'user-1',
  content: 'Mi primera publicación',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  author: {
    id: 'user-1',
    nickname: 'juan_dev',
    profilePicture: null,
  },
};

describe('PostsFeed', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra el estado de carga mientras espera la respuesta', () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    render(<PostsFeed />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando publicaciones',
    );
  });

  it('muestra las publicaciones recibidas', async () => {
    requestMock.mockResolvedValue([post]);

    render(<PostsFeed />);

    expect(
      await screen.findByText('Mi primera publicación'),
    ).toBeInTheDocument();

    expect(screen.getByText('@juan_dev')).toBeInTheDocument();

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/posts',
      }),
    );
  });

  it('muestra un estado vacío cuando no hay publicaciones', async () => {
    requestMock.mockResolvedValue([]);

    render(<PostsFeed />);

    expect(
      await screen.findByText('Aún no hay publicaciones'),
    ).toBeInTheDocument();
  });

  it('permite reintentar cuando falla la consulta', async () => {
    requestMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([post]);

    const user = userEvent.setup();

    render(<PostsFeed />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar las publicaciones.',
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByText('Mi primera publicación'),
    ).toBeInTheDocument();
  });

  it('cancela la petición al desmontarse', () => {
    requestMock.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(<PostsFeed />);

    const config = requestMock.mock.calls[0][0] as {
      signal: AbortSignal;
    };

    expect(config.signal.aborted).toBe(false);

    unmount();

    expect(config.signal.aborted).toBe(true);
  });
});
