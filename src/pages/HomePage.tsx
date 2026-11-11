import { useAuth } from '../features/auth/context/auth-context';
import { PostsFeed } from '../features/posts/components/PostsFeed';

export function HomePage() {
  const { accessToken, signOut } = useAuth();

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
          className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-hover"
        >
          Cerrar sesión
        </button>
      </div>

      <PostsFeed key={accessToken} />
    </main>
  );
}
