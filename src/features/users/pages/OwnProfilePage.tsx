import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { useAuthenticatedApi } from '../../auth/api/use-authenticated-api';
import { useAuth } from '../../auth/context/auth-context';
import { ProfileDetails } from '../components/ProfileDetails';
import { EditProfileDialog } from '../components/EditProfileDialog';
import { ChangeProfilePictureDialog } from '../components/ChangeProfilePictureDialog';
import type { UserProfile } from '../types/user-profile.types';

type ProfileState =
  | { status: 'loading' }
  | { status: 'success'; profile: UserProfile }
  | { status: 'not-found' }
  | { status: 'error' };

export function OwnProfilePage() {
  const { accessToken } = useAuth();

  return <OwnProfileContent key={accessToken} />;
}

function OwnProfileContent() {
  const { request } = useAuthenticatedApi();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [isChangingPicture, setIsChangingPicture] = useState(false);
  const [pictureSaved, setPictureSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    request<UserProfile>({
      method: 'GET',
      url: '/users/me',
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
  }, [request, attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
      <Link
        to="/"
        className="inline-flex min-h-10 items-center rounded-lg text-sm font-medium text-muted hover:text-foreground"
      >
        ← Volver al inicio
      </Link>

      <p className="mt-6 text-2xl font-semibold tracking-tight">Mi perfil</p>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-sm text-muted">
          Cargando tu perfil…
        </p>
      )}

      {state.status === 'not-found' && (
        <p role="alert" className="mt-8 text-sm text-danger">
          No encontramos el usuario de esta sesión.
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="mt-8">
          <p className="text-sm text-danger">
            No fue posible cargar tu perfil.
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

      {state.status === 'success' && (
        <>
          <ProfileDetails
            profile={state.profile}
            onEdit={() => {
              setSaved(false);
              setIsEditing(true);
            }}
            onChangePicture={() => {
              setPictureSaved(false);
              setIsChangingPicture(true);
            }}
          />

          {saved && (
            <p role="status" className="mt-4 text-sm text-accent-foreground">
              Perfil actualizado.
            </p>
          )}

          {pictureSaved && (
            <p role="status" className="mt-4 text-sm text-accent-foreground">
              Foto de perfil actualizada.
            </p>
          )}

          {isEditing && (
            <EditProfileDialog
              profile={state.profile}
              onClose={() => setIsEditing(false)}
              onSaved={(profile) => {
                setState({ status: 'success', profile });
                setIsEditing(false);
                setSaved(true);
              }}
            />
          )}

          {isChangingPicture && (
            <ChangeProfilePictureDialog
              onClose={() => setIsChangingPicture(false)}
              onSaved={(profile) => {
                setState({ status: 'success', profile });
                setIsChangingPicture(false);
                setPictureSaved(true);
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
