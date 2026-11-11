import type { Post } from '../types/post.types';

interface PostCardProps {
  post: Post;
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function PostCard({ post }: PostCardProps) {
  const date = new Date(post.createdAt);
  const hasValidDate = !Number.isNaN(date.getTime());

  const initial = post.author.nickname.trim().charAt(0).toUpperCase() || '?';

  return (
    <article className="border-b border-border py-6">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-semibold text-accent-foreground"
        >
          {initial}

          {post.author.profilePicture && (
            <img
              src={post.author.profilePicture}
              alt=""
              className="absolute inset-0 size-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">@{post.author.nickname}</span>

            <time
              dateTime={hasValidDate ? post.createdAt : undefined}
              className="text-sm text-muted"
            >
              {hasValidDate
                ? dateFormatter.format(date)
                : 'Fecha no disponible'}
            </time>
          </div>

          <p className="mt-3 whitespace-pre-wrap wrap-break-word leading-7 text-foreground">
            {post.content}
          </p>
        </div>
      </div>
    </article>
  );
}
