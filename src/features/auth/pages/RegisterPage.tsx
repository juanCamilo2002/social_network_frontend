import { isAxiosError } from 'axios';
import { useFormik } from 'formik';
import { UserRoundPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';

import { register } from '../api/auth.api';
import { useAuth } from '../context/auth-context';
import { registerSchema } from '../schemas/register.schema';

interface RegisterFormValues {
  nickname: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  birthdate: string;
}

const fields = [
  {
    name: 'nickname',
    label: 'Nickname',
    type: 'text',
    autoComplete: 'nickname',
    maxLength: 50,
    required: true,
  },
  {
    name: 'name',
    label: 'Nombre',
    type: 'text',
    autoComplete: 'given-name',
    maxLength: 100,
    required: true,
  },
  {
    name: 'lastName',
    label: 'Apellido',
    type: 'text',
    autoComplete: 'family-name',
    maxLength: 100,
    required: true,
  },
  {
    name: 'email',
    label: 'Correo electrónico',
    type: 'email',
    autoComplete: 'email',
    maxLength: 254,
    required: true,
  },
  {
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    autoComplete: 'new-password',
    maxLength: 128,
    required: true,
  },
  {
    name: 'birthdate',
    label: 'Fecha de nacimiento (opcional)',
    type: 'date',
    autoComplete: 'bday',
    maxLength: undefined,
    required: false,
  },
] as const;

export function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const formik = useFormik<RegisterFormValues>({
    initialValues: {
      nickname: '',
      name: '',
      lastName: '',
      email: '',
      password: '',
      birthdate: '',
    },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      setError(null);

      try {
        await register({
          nickname: values.nickname.trim(),
          name: values.name.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          password: values.password,
          ...(values.birthdate ? { birthdate: values.birthdate } : {}),
        });

        navigate('/login', {
          replace: true,
          state: { registrationSuccess: true },
        });
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 409) {
          setError('El correo o el nickname ya están registrados.');
        } else {
          setError('No fue posible crear la cuenta. Inténtalo de nuevo.');
        }
      }
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-14 sm:px-10 lg:grid-cols-2 lg:gap-24 lg:py-20">
      <section
        className="hidden max-w-lg lg:block"
        aria-label="Sobre este espacio"
      >
        <div className="mb-9 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground">
          <UserRoundPlus
            aria-hidden="true"
            className="size-7"
            strokeWidth={1.5}
          />
        </div>

        <h2 className="max-w-md text-5xl leading-[1.12] font-semibold tracking-tight text-foreground text-balance">
          Crea tu espacio para compartir.
        </h2>

        <p className="mt-6 max-w-sm text-base leading-7 text-muted">
          Elige tu nickname y comienza a formar parte de la comunidad.
        </p>
      </section>

      <section
        className="w-full max-w-md lg:ml-auto"
        aria-labelledby="register-title"
      >
        <h1
          id="register-title"
          className="text-3xl font-semibold tracking-tight"
        >
          Crear cuenta
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          Completa tus datos para comenzar.
        </p>

        <form
          onSubmit={formik.handleSubmit}
          noValidate
          className="mt-9 space-y-5"
        >
          {fields.map((field) => {
            const fieldError =
              formik.touched[field.name] && formik.errors[field.name];

            const errorId = `${field.name}-error`;

            return (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="mb-2 block text-sm font-medium"
                >
                  {field.label}
                </label>

                <input
                  id={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  required={field.required}
                  maxLength={field.maxLength}
                  {...formik.getFieldProps(field.name)}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? errorId : undefined}
                  className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-foreground"
                />

                {fieldError && (
                  <p id={errorId} className="mt-2 text-sm text-danger">
                    {fieldError}
                  </p>
                )}
              </div>
            );
          })}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="min-h-12 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-7 text-sm text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            to="/login"
          >
            Iniciar sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
