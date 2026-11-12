import { useEffect, useRef, useState } from 'react';

import type { UserProfile } from '../types/user-profile.types';
import { EditProfileForm } from './EditProfileForm';

interface EditProfileDialogProps {
  profile: UserProfile;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
}

export function EditProfileDialog({
  profile,
  onClose,
  onSaved,
}: EditProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('#profile-name')?.focus();

    return () => {
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-profile-title"
      onCancel={(event) => {
        event.preventDefault();

        if (!isSaving) {
          onClose();
        }
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-background text-foreground shadow-xl backdrop:bg-black/60"
    >
      <EditProfileForm
        profile={profile}
        onCancel={onClose}
        onSaved={onSaved}
        onSavingChange={setIsSaving}
      />
    </dialog>
  );
}
