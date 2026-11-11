import { MessageSquareText } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useAuthenticatedApi } from '../../auth/api/use-authenticated-api';
import type { Post } from '../types/post.types';
import { PostCard } from './PostCard';

type FeedState =
  | { status: 'loading' }
  | { status: 'success'; posts: Post[] }
  | { status: 'error' };

export function PostsFeed() {
  const { request } = useAuthenticatedApi();

  const [state, setState] = useState<FeedState>({
    status: 'loading',
  });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    request<Post[]>({
      method: 'GET',
      url: '/posts',
      signal: controller.signal,
    })
      .then((posts) => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', posts });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' });
        }
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
    <section aria-labelledby="feed-title" className="py-10">
      <h2 id="feed-title" className="text-xl font-semibold tracking-tight">
        Publicaciones
      </h2>

      {state.status === 'loading' && (
        <p role="status" className="mt-6 text-sm text-muted">
          Cargando publicaciones…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="mt-6">
          <p className="text-sm text-danger">
            No fue posible cargar las publicaciones.
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

      {state.status === 'success' && state.posts.length === 0 && (
        <div className="py-12">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground">
            <MessageSquareText
              aria-hidden="true"
              className="size-6"
              strokeWidth={1.5}
            />
          </div>

          <p className="mt-5 font-medium">Aún no hay publicaciones</p>

          <p className="mt-2 text-sm leading-6 text-muted">
            Cuando haya publicaciones, aparecerán aquí.
          </p>
        </div>
      )}

      {state.status === 'success' && state.posts.length > 0 && (
        <div className="mt-2">
          {state.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
