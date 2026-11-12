import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreatePostForm } from '../src/features/posts/components/CreatePostForm';
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
  content: 'Hola comunidad',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  author: {
    id: 'user-1',
    nickname: 'juan_dev',
    profilePicture: null,
  },
};

describe('CreatePostForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rechaza contenido vacío o con solo espacios', async () => {
    const user = userEvent.setup();

    render(<CreatePostForm onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText('¿Qué quieres compartir?'), '   ');
    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(
      await screen.findByText('Escribe algo antes de publicar'),
    ).toBeInTheDocument();

    expect(requestMock).not.toHaveBeenCalled();
  });

  it('envía el contenido, notifica al feed y limpia el formulario', async () => {
    requestMock.mockResolvedValue(post);

    const onCreated = vi.fn();
    const user = userEvent.setup();

    render(<CreatePostForm onCreated={onCreated} />);

    const content = screen.getByLabelText('¿Qué quieres compartir?');

    await user.type(content, '  Hola comunidad  ');
    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Publicación creada.',
    );

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/posts',
        data: {
          content: 'Hola comunidad',
        },
      }),
    );

    expect(onCreated).toHaveBeenCalledWith(post);
    expect(content).toHaveValue('');
  });

  it('conserva el texto si falla la petición', async () => {
    requestMock.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    const onCreated = vi.fn();

    render(<CreatePostForm onCreated={onCreated} />);

    const content = screen.getByLabelText('¿Qué quieres compartir?');

    await user.type(content, 'Hola comunidad');
    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos confirmar la publicación.',
    );

    expect(content).toHaveValue('Hola comunidad');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('deshabilita el botón mientras se publica', async () => {
    let resolveRequest!: (value: Post) => void;

    const pendingRequest = new Promise<Post>((resolve) => {
      resolveRequest = resolve;
    });

    requestMock.mockReturnValue(pendingRequest);

    const user = userEvent.setup();

    render(<CreatePostForm onCreated={vi.fn()} />);

    await user.type(
      screen.getByLabelText('¿Qué quieres compartir?'),
      'Hola comunidad',
    );

    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(
      await screen.findByRole('button', { name: 'Publicando…' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('¿Qué quieres compartir?')).toBeDisabled();

    await act(async () => {
      resolveRequest(post);
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Publicación creada.',
    );
  });
});
