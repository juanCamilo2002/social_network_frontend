import { useFormik } from 'formik';
import { useEffect, useRef, useState } from 'react';

import { useAuthenticatedApi } from '../../auth/api/use-authenticated-api';
import { createPostSchema } from '../schemas/create-post.schema';
import type { Post } from '../types/post.types';

interface CreatePostFormProps {
  onCreated: (post: Post) => void;
}

interface CreatePostValues {
  content: string;
}

type Feedback = 'success' | 'error' | null;

export function CreatePostForm({ onCreated }: CreatePostFormProps) {
  const { request } = useAuthenticatedApi();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  const formik = useFormik<CreatePostValues>({
    initialValues: {
      content: '',
    },
    validationSchema: createPostSchema,
    onSubmit: async (values, { resetForm }) => {
      setFeedback(null);

      const controller = new AbortController();
      activeRequest.current = controller;

      try {
        const post = await request<Post>({
          method: 'POST',
          url: '/posts',
          data: {
            content: values.content.trim(),
          },
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        onCreated(post);
        resetForm();
        setFeedback('success');
      } catch {
        if (!controller.signal.aborted) {
          setFeedback('error');
        }
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = null;
        }
      }
    },
  });

  const contentError = formik.touched.content && formik.errors.content;

  return (
    <form
      onSubmit={formik.handleSubmit}
      noValidate
      className="mt-6 border-b border-border pb-6"
    >
      <label htmlFor="content" className="mb-2 block text-sm font-medium">
        ¿Qué quieres compartir?
      </label>

      <textarea
        id="content"
        rows={3}
        required
        disabled={formik.isSubmitting}
        {...formik.getFieldProps('content')}
        aria-invalid={Boolean(contentError)}
        aria-describedby={contentError ? 'content-error' : undefined}
        className="w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-foreground"
      />
      {contentError && (
        <p id="content-error" className="mt-2 text-sm text-danger">
          {contentError}
        </p>
      )}

      {feedback === 'error' && (
        <p role="alert" className="mt-3 text-sm text-danger">
          No pudimos confirmar la publicación. Revisa el feed antes de volver a
          intentarlo.
        </p>
      )}

      {feedback === 'success' && (
        <p role="status" className="mt-3 text-sm text-accent-foreground">
          Publicación creada.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="min-h-10 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {formik.isSubmitting ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </form>
  );
}
