import { Pencil } from 'lucide-react';

import type { UserProfile } from '../types/user-profile.types';

interface ProfileDetailsProps {
  profile: UserProfile;
  onEdit?: () => void;
}

export function ProfileDetails({ profile, onEdit }: ProfileDetailsProps) {
  const initial = profile.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <article className="mt-6 overflow-hidden rounded-xl border border-border">
      <div className="relative h-32 bg-accent-soft sm:h-40">
        {profile.banner && (
          <img
            src={profile.banner}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      <div className="px-5 pb-6 sm:px-7 sm:pb-8">
        <div
          aria-hidden="true"
          className="relative -mt-10 flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-accent-soft text-2xl font-semibold text-accent-foreground"
        >
          {initial}

          {profile.profilePicture && (
            <img
              src={profile.profilePicture}
              alt=""
              className="absolute inset-0 size-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
        </div>

        {onEdit && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Editar perfil"
              title="Editar perfil"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}

        <h1 className="mt-4 wrap-break-word text-2xl font-semibold tracking-tight">
          {profile.name} {profile.lastName}
        </h1>

        <p className="mt-1 wrap-break-word text-sm text-muted">
          @{profile.nickname}
        </p>

        {profile.biography && (
          <p className="mt-6 wrap-break-word whitespace-pre-wrap text-sm leading-6">
            {profile.biography}
          </p>
        )}
      </div>
    </article>
  );
}
