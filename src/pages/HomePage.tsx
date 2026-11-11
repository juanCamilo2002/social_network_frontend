import { MessageSquareText } from 'lucide-react';

import { useAuth } from '../features/auth/context/auth-context';

export function HomePage() {
  const { signOut } = useAuth();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tu espacio</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Tu sesión está activa.
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-hover"
        >
          Cerrar sesión
        </button>
      </div>

      <section className="py-12 sm:py-16" aria-labelledby="feed-title">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground">
          <MessageSquareText
            aria-hidden="true"
            className="size-6"
            strokeWidth={1.5}
          />
        </div>
        <h2
          id="feed-title"
          className="mt-6 text-xl font-semibold tracking-tight"
        >
          Las publicaciones estarán aquí
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          Estamos preparando este espacio para que puedas descubrir y compartir
          publicaciones.
        </p>
      </section>
    </main>
  );
}
