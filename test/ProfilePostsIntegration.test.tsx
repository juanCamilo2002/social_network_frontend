import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OwnProfilePage } from '../src/features/users/pages/OwnProfilePage';
import { UserProfilePage } from '../src/features/users/pages/UserProfilePage';
import type { UserProfile } from '../src/features/users/types/user-profile.types';
import type { Post } from '../src/features/posts/types/post.types';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock('../src/features/auth/api/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({ request: requestMock }),
}));

vi.mock('../src/features/auth/context/auth-context', () => ({
  useAuth: () => ({ accessToken: 'test-token' }),
}));

const profile: UserProfile = {
  id: 'user-1',
  nickname: 'juan_dev',
  name: 'Juan',
  lastName: 'Pérez',
  profilePicture: null,
  banner: null,
  biography: null,
};

const post: Post = {
  id: 'post-1',
  authorId: profile.id,
  content: 'Publicación de Juan',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  author: { id: profile.id, nickname: profile.nickname, profilePicture: null },
};

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/me" element={<OwnProfilePage />} />
        <Route path="/profile/:nickname" element={<UserProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Publicaciones en perfiles', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it.each(['/me', '/profile/juan_dev'])(
    'consulta y muestra publicaciones del autor en %s',
    async (path) => {
      requestMock.mockImplementation((config: { url: string }) => {
        if (config.url === '/posts') return Promise.resolve([post]);
        return Promise.resolve(profile);
      });

      renderPage(path);

      expect(
        await screen.findByRole('heading', { name: 'Juan Pérez' }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Publicación de Juan'),
      ).toBeInTheDocument();
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/posts',
          params: { authorId: profile.id },
          signal: expect.any(AbortSignal),
        }),
      );
    },
  );

  it('mantiene visible el perfil y permite reintentar si falla la lista', async () => {
    let attempts = 0;
    requestMock.mockImplementation((config: { url: string }) => {
      if (config.url !== '/posts') return Promise.resolve(profile);
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error('Error de red'))
        : Promise.resolve([post]);
    });
    const user = userEvent.setup();

    renderPage('/profile/juan_dev');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar las publicaciones.',
    );
    expect(
      screen.getByRole('heading', { name: 'Juan Pérez' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Publicación de Juan')).toBeInTheDocument();
  });
});
