import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { useAuthenticatedApi } from '../../auth/api/use-authenticated-api';
import { useAuth } from '../../auth/context/auth-context';
import type { UserProfile } from '../types/user-profile.types';
import { ProfileDetails } from '../components/ProfileDetails';

type ProfileState =
  | { status: 'loading' }
  | { status: 'success'; profile: UserProfile }
  | { status: 'not-found' }
  | { status: 'error' };

export function UserProfilePage() {
  const { nickname } = useParams<{ nickname: string }>();
  const { accessToken } = useAuth();

  if (!nickname) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        <p role="alert">No se especificó un usuario.</p>
      </main>
    );
  }

  return (
    <UserProfileContent
      key={JSON.stringify([nickname, accessToken])}
      nickname={nickname}
    />
  );
}

function UserProfileContent({ nickname }: { nickname: string }) {
  const { request } = useAuthenticatedApi();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    request<UserProfile>({
      method: 'GET',
      url: `/users/by-nickname/${encodeURIComponent(nickname)}`,
      signal: controller.signal,
    })
      .then((profile) => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', profile });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (isAxiosError(error) && error.response?.status === 404) {
          setState({ status: 'not-found' });
          return;
        }

        setState({ status: 'error' });
      });

    return () => {
      controller.abort();
    };
  }, [nickname, request, attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
      <Link
        to="/search"
        className="inline-flex min-h-10 items-center rounded-lg text-sm font-medium text-muted hover:text-foreground"
      >
        ← Volver a buscar personas
      </Link>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-sm text-muted">
          Cargando perfil…
        </p>
      )}

      {state.status === 'not-found' && (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Perfil no encontrado
          </h1>
          <p className="mt-3 text-sm text-muted">
            No encontramos un usuario con ese nickname.
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div role="alert" className="mt-8">
          <p className="text-sm text-danger">
            No fue posible cargar el perfil.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-hover"
          >
            Reintentar
          </button>
        </div>
      )}

      {state.status === 'success' && <ProfileDetails profile={state.profile} />}
    </main>
  );
}
