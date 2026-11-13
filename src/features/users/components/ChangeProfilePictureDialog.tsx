import { useEffect, useRef, useState } from 'react';

import { useAuthenticatedApi } from '../../auth/api/use-authenticated-api';
import type { UserProfile } from '../types/user-profile.types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface Selection {
  file: File;
  previewUrl: string;
}

interface ChangeProfilePictureDialogProps {
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
}

export function ChangeProfilePictureDialog({
  onClose,
  onSaved,
}: ChangeProfilePictureDialogProps) {
  const { request } = useAuthenticatedApi();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();
    inputRef.current?.focus();

    return () => {
      dialog.close();
    };
  }, []);

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (selection) {
        URL.revokeObjectURL(selection.previewUrl);
      }
    };
  }, [selection]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setError(null);

    if (file.type && !allowedTypes.has(file.type)) {
      setSelection(null);
      setError('Selecciona una imagen JPEG, PNG o WebP.');
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      setSelection(null);
      setError('La imagen debe tener un tamaño de hasta 5 MiB.');
      return;
    }

    setSelection({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selection || activeRequest.current) {
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;

    setError(null);
    setIsUploading(true);

    const data = new FormData();
    data.append('file', selection.file);

    try {
      const profile = await request<UserProfile>({
        method: 'POST',
        url: '/users/me/profile-picture',
        data,
        signal: controller.signal,
        headers: {
          'Content-Type': undefined,
        },
      });

      if (!controller.signal.aborted) {
        onSaved(profile);
      }
    } catch {
      if (!controller.signal.aborted) {
        setError(
          'No pudimos confirmar la subida. Comprueba tu perfil antes de intentarlo de nuevo.',
        );
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }

      if (!controller.signal.aborted) {
        setIsUploading(false);
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="change-picture-title"
      onCancel={(event) => {
        event.preventDefault();

        if (!isUploading) {
          onClose();
        }
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-black/60 sm:p-7"
    >
      <form onSubmit={handleSubmit}>
        <h2 id="change-picture-title" className="text-lg font-semibold">
          Cambiar foto de perfil
        </h2>

        <p id="picture-help" className="mt-2 text-sm text-muted">
          Selecciona una imagen JPEG, PNG o WebP de hasta 5 MiB.
        </p>

        <label
          htmlFor="profile-picture-file"
          className="mt-5 block text-sm font-medium"
        >
          Seleccionar imagen
        </label>

        <input
          ref={inputRef}
          id="profile-picture-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isUploading}
          onChange={handleFileChange}
          aria-describedby="picture-help"
          className="mt-2 block w-full text-sm text-foreground file:mr-4 file:rounded-lg file:border file:border-border file:bg-background file:px-4 file:py-2 file:text-sm file:font-medium"
        />

        {selection && (
          <div className="mt-5">
            <p className="text-sm font-medium">Vista previa</p>
            <img
              src={selection.previewUrl}
              alt="Vista previa de la nueva foto de perfil"
              className="mt-2 max-h-64 w-full rounded-lg bg-surface object-contain"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={!selection || isUploading}
            className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? 'Subiendo…' : 'Guardar foto'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
