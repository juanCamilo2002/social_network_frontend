import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useAuthenticatedApi } from '../../auth/api/use-authenticated-api';
import { useAuth } from '../../auth/context/auth-context';
import type { UserSearchResult } from '../types/user-search.types';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; users: UserSearchResult[] }
  | { status: 'error' };

export function UsersSearchPage() {
  const { accessToken } = useAuth();

  // Reinicia la búsqueda si cambia la sesión.
  return <UsersSearch key={accessToken} />;
}

function UsersSearch() {
  const { request } = useAuthenticatedApi();

  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  const activeRequest = useRef<AbortController | null>(null);
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;

    const timeout = window.setTimeout(() => {
      if (controller.signal.aborted) {
        return;
      }

      request<UserSearchResult[]>({
        method: 'GET',
        url: '/users/search',
        params: { q: normalizedQuery },
        signal: controller.signal,
      })
        .then((users) => {
          if (!controller.signal.aborted) {
            setState({ status: 'success', users });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setState({ status: 'error' });
          }
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();

      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }
    };
  }, [normalizedQuery, request, attempt]);

  function handleQueryChange(value: string) {
    const nextQuery = value.trim();

    if (nextQuery !== normalizedQuery) {
      // Evita que una respuesta anterior actualice la nueva búsqueda.
      activeRequest.current?.abort();

      setState(
        nextQuery.length < 2 ? { status: 'idle' } : { status: 'loading' },
      );
    }

    setQuery(value);
  }

  function retry() {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Buscar personas</h1>

      <p className="mt-3 text-sm leading-6 text-muted">
        Encuentra personas por su nickname, nombre o apellido.
      </p>

      <div className="mt-8">
        <label htmlFor="user-search" className="mb-2 block text-sm font-medium">
          Buscar usuarios
        </label>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
            strokeWidth={1.5}
          />

          <input
            id="user-search"
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            maxLength={201}
            autoComplete="off"
            aria-describedby="search-help"
            placeholder="Nombre o nickname"
            className="min-h-12 w-full rounded-lg border border-border bg-background py-2 pr-4 pl-12 text-foreground placeholder:text-muted"
          />
        </div>

        <p id="search-help" className="mt-2 text-sm text-muted">
          Escribe al menos dos caracteres.
        </p>
      </div>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-sm text-muted">
          Buscando personas…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="mt-8">
          <p className="text-sm text-danger">
            No fue posible realizar la búsqueda.
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

      {state.status === 'success' && state.users.length === 0 && (
        <p role="status" className="mt-8 text-sm text-muted">
          No encontramos personas para esta búsqueda.
        </p>
      )}

      {state.status === 'success' && state.users.length > 0 && (
        <section aria-labelledby="results-title" className="mt-8">
          <h2 id="results-title" className="text-lg font-semibold">
            Resultados
          </h2>

          <ul className="mt-3">
            {state.users.map((user) => {
              const initial = user.name.trim().charAt(0).toUpperCase() || '?';

              return (
                <li
                  key={user.id}
                  className="flex items-center gap-4 border-b border-border py-4"
                >
                  <div
                    aria-hidden="true"
                    className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-semibold text-accent-foreground"
                  >
                    {initial}

                    {user.profilePicture && (
                      <img
                        src={user.profilePicture}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="wrap-break-word font-medium">
                      {user.name} {user.lastName}
                    </p>

                    <p className="wrap-break-word text-sm text-muted">
                      @{user.nickname}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {state.users.length === 20 && (
            <p className="mt-4 text-sm text-muted">
              Se muestran hasta 20 resultados. Puedes precisar tu búsqueda.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
