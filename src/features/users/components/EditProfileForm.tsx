import { useFormik } from 'formik';
import { useEffect, useRef, useState } from 'react';

import { useAuthenticatedApi } from '../../auth/api/use-authenticated-api';
import { editProfileSchema } from '../schemas/edit-profile.schema';
import type { UserProfile } from '../types/user-profile.types';

interface EditProfileFormProps {
  profile: UserProfile;
  onSaved: (profile: UserProfile) => void;
  onCancel: () => void;
  onSavingChange: (saving: boolean) => void;
}

interface EditProfileValues {
  name: string;
  lastName: string;
  biography: string;
}

export function EditProfileForm({
  profile,
  onSaved,
  onCancel,
  onSavingChange,
}: EditProfileFormProps) {
  const { request } = useAuthenticatedApi();
  const [saveError, setSaveError] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  const formik = useFormik<EditProfileValues>({
    initialValues: {
      name: profile.name,
      lastName: profile.lastName,
      biography: profile.biography ?? '',
    },
    validationSchema: editProfileSchema,
    onSubmit: async (values) => {
      setSaveError(false);

      onSavingChange(true);

      const controller = new AbortController();
      activeRequest.current = controller;

      try {
        const updatedProfile = await request<UserProfile>({
          method: 'PATCH',
          url: '/users/me',
          data: {
            name: values.name.trim(),
            lastName: values.lastName.trim(),
            biography: values.biography.trim() || null,
          },
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          onSaved(updatedProfile);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSaveError(true);
        }
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = null;
        }

        if (!controller.signal.aborted) {
          onSavingChange(false);
        }
      }
    },
  });

  const nameError = formik.touched.name && formik.errors.name;
  const lastNameError = formik.touched.lastName && formik.errors.lastName;
  const biographyError = formik.touched.biography && formik.errors.biography;

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="p-5 sm:p-7">
      <h2 id="edit-profile-title" className="text-lg font-semibold">
        Editar perfil
      </h2>

      <div className="mt-5">
        <label
          htmlFor="profile-name"
          className="mb-2 block text-sm font-medium"
        >
          Nombre
        </label>

        <input
          id="profile-name"
          type="text"
          autoComplete="given-name"
          required
          disabled={formik.isSubmitting}
          {...formik.getFieldProps('name')}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? 'profile-name-error' : undefined}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-4 text-foreground"
        />

        {nameError && (
          <p id="profile-name-error" className="mt-2 text-sm text-danger">
            {nameError}
          </p>
        )}
      </div>

      <div className="mt-5">
        <label
          htmlFor="profile-last-name"
          className="mb-2 block text-sm font-medium"
        >
          Apellido
        </label>

        <input
          id="profile-last-name"
          type="text"
          autoComplete="family-name"
          required
          disabled={formik.isSubmitting}
          {...formik.getFieldProps('lastName')}
          aria-invalid={Boolean(lastNameError)}
          aria-describedby={
            lastNameError ? 'profile-last-name-error' : undefined
          }
          className="min-h-11 w-full rounded-lg border border-border bg-background px-4 text-foreground"
        />

        {lastNameError && (
          <p id="profile-last-name-error" className="mt-2 text-sm text-danger">
            {lastNameError}
          </p>
        )}
      </div>

      <div className="mt-5">
        <label
          htmlFor="profile-biography"
          className="mb-2 block text-sm font-medium"
        >
          Biografía <span className="font-normal text-muted">(opcional)</span>
        </label>

        <textarea
          id="profile-biography"
          rows={4}
          disabled={formik.isSubmitting}
          {...formik.getFieldProps('biography')}
          aria-invalid={Boolean(biographyError)}
          aria-describedby={
            biographyError
              ? 'profile-biography-help profile-biography-error'
              : 'profile-biography-help'
          }
          className="w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-foreground"
        />

        <p id="profile-biography-help" className="mt-2 text-sm text-muted">
          Hasta 500 caracteres. Déjala vacía para eliminarla.
        </p>

        {biographyError && (
          <p id="profile-biography-error" className="mt-2 text-sm text-danger">
            {biographyError}
          </p>
        )}
      </div>

      {saveError && (
        <p role="alert" className="mt-5 text-sm text-danger">
          No pudimos confirmar los cambios. Inténtalo de nuevo.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={formik.isSubmitting}
          className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {formik.isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
