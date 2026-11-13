import { Camera, Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProfilePictureProps {
  name: string;
  pictureUrl: string | null;
  onChangePicture?: () => void;
}

export function ProfilePicture({
  name,
  pictureUrl,
  onChangePicture,
}: ProfilePictureProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const hasPicture = Boolean(pictureUrl) && failedUrl !== pictureUrl;

  return (
    <>
      <div className="group relative -mt-12 flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-accent-soft text-3xl font-semibold text-accent-foreground sm:size-28">
        <span aria-hidden="true">{initial}</span>

        {pictureUrl && hasPicture && (
          <img
            src={pictureUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={() => setFailedUrl(pictureUrl)}
          />
        )}

        {(hasPicture || onChangePicture) && (
          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/55 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
            {hasPicture && (
              <button
                type="button"
                onClick={() => setIsViewerOpen(true)}
                aria-label="Ver foto de perfil"
                title="Ver foto de perfil"
                className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Eye aria-hidden="true" className="size-5" />
              </button>
            )}

            {onChangePicture && (
              <button
                type="button"
                onClick={onChangePicture}
                aria-label="Cambiar foto de perfil"
                title="Cambiar foto de perfil"
                className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Camera aria-hidden="true" className="size-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {isViewerOpen && pictureUrl && (
        <ProfilePictureViewer
          name={name}
          pictureUrl={pictureUrl}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}

interface ProfilePictureViewerProps {
  name: string;
  pictureUrl: string;
  onClose: () => void;
}

function ProfilePictureViewer({
  name,
  pictureUrl,
  onClose,
}: ProfilePictureViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();
    closeButtonRef.current?.focus();

    return () => {
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="profile-picture-viewer-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-border bg-background p-4 text-foreground shadow-xl backdrop:bg-black/70 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="profile-picture-viewer-title" className="text-lg font-semibold">
          Foto de perfil
        </h2>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-hover"
        >
          Cerrar
        </button>
      </div>

      <img
        src={pictureUrl}
        alt={`Foto de perfil de ${name}`}
        className="mt-4 max-h-[70dvh] w-full rounded-lg object-contain"
      />
    </dialog>
  );
}
