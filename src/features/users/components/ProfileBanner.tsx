import { Camera, Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProfileBannerProps {
  name: string;
  bannerUrl: string | null;
  onChangeBanner?: () => void;
}

export function ProfileBanner({
  name,
  bannerUrl,
  onChangeBanner,
}: ProfileBannerProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const hasBanner = Boolean(bannerUrl) && failedUrl !== bannerUrl;

  return (
    <>
      <div className="relative h-32 bg-accent-soft sm:h-40">
        {bannerUrl && hasBanner && (
          <img
            src={bannerUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={() => setFailedUrl(bannerUrl)}
          />
        )}

        {(hasBanner || onChangeBanner) && (
          <div className="absolute right-3 top-3 flex gap-2">
            {hasBanner && (
              <button
                type="button"
                onClick={() => setIsViewerOpen(true)}
                aria-label="Ver banner"
                title="Ver banner"
                className="inline-flex size-11 items-center justify-center rounded-lg bg-black/70 text-white hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Eye aria-hidden="true" className="size-5" />
              </button>
            )}

            {onChangeBanner && (
              <button
                type="button"
                onClick={onChangeBanner}
                aria-label="Cambiar banner"
                title="Cambiar banner"
                className="inline-flex size-11 items-center justify-center rounded-lg bg-black/70 text-white hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Camera aria-hidden="true" className="size-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {isViewerOpen && bannerUrl && hasBanner && (
        <ProfileBannerViewer
          name={name}
          bannerUrl={bannerUrl}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}

interface ProfileBannerViewerProps {
  name: string;
  bannerUrl: string;
  onClose: () => void;
}

function ProfileBannerViewer({
  name,
  bannerUrl,
  onClose,
}: ProfileBannerViewerProps) {
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
      aria-labelledby="profile-banner-viewer-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl border border-border bg-background p-4 text-foreground shadow-xl backdrop:bg-black/70 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="profile-banner-viewer-title" className="text-lg font-semibold">
          Banner de perfil
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
        src={bannerUrl}
        alt={`Banner de perfil de ${name}`}
        className="mt-4 max-h-[70dvh] w-full rounded-lg object-contain"
      />
    </dialog>
  );
}