import { isAxiosError } from 'axios';
import { useFormik } from 'formik';
import { MessageSquareText } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router';

import { useAuth } from '../context/auth-context';
import { loginSchema } from '../schemas/login.schema';
import type { LoginCredentials } from '../types/auth.types';

export function LoginPage() {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState<string | null>(null);

  const formik = useFormik<LoginCredentials>({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setError(null);

      try {
        await signIn({
          email: values.email.trim(),
          password: values.password,
        });

        navigate('/', { replace: true });
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 401) {
          setError('El correo o la contraseña son incorrectos.');
        } else {
          setError('No fue posible iniciar sesión. Inténtalo de nuevo.');
        }
      }
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const registrationSuccess =
    typeof location.state === 'object' &&
    location.state !== null &&
    'registrationSuccess' in location.state &&
    location.state.registrationSuccess === true;

  return (
    <main className="mx-auto grid min-h-[calc(100svh-4.5rem)] w-full max-w-7xl items-center gap-12 px-6 py-14 sm:px-10 lg:grid-cols-2 lg:gap-24 lg:py-20">
      <section
        className="hidden max-w-lg lg:block"
        aria-label="Sobre este espacio"
      >
        <div className="mb-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground">
          <MessageSquareText
            aria-hidden="true"
            className="size-7"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="max-w-md text-5xl leading-[1.12] font-semibold tracking-tight text-foreground text-balance">
          Un espacio para compartir lo que importa.
        </h2>
        <p className="mt-6 max-w-sm text-base leading-7 text-muted">
          Conecta con otras personas y encuentra conversaciones que valen la
          pena.
        </p>
        <div className="mt-12 flex items-center gap-3 text-sm text-muted">
          <span aria-hidden="true" className="h-px w-10 bg-accent" />
          Tu comunidad comienza aquí
        </div>
      </section>

      <section
        className="w-full max-w-md lg:ml-auto"
        aria-labelledby="login-title"
      >
        <h1 id="login-title" className="text-3xl font-semibold tracking-tight">
          Iniciar sesión
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          Ingresa con tu correo y contraseña.
        </p>

        {registrationSuccess && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-foreground"
          >
            Cuenta creada. Ya puedes iniciar sesión.
          </p>
        )}

        <form
          onSubmit={formik.handleSubmit}
          noValidate
          className="mt-9 space-y-5"
        >
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              {...formik.getFieldProps('email')}
              aria-invalid={Boolean(
                formik.touched.email && formik.errors.email,
              )}
              aria-describedby={
                formik.touched.email && formik.errors.email
                  ? 'email-error'
                  : undefined
              }
              className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-foreground placeholder:text-muted"
            />

            {formik.touched.email && formik.errors.email && (
              <p id="email-error" className="mt-2 text-sm text-danger">
                {formik.errors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              {...formik.getFieldProps('password')}
              aria-invalid={Boolean(
                formik.touched.password && formik.errors.password,
              )}
              aria-describedby={
                formik.touched.password && formik.errors.password
                  ? 'password-error'
                  : undefined
              }
              className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-foreground placeholder:text-muted"
            />

            {formik.touched.password && formik.errors.password && (
              <p id="password-error" className="mt-2 text-sm text-danger">
                {formik.errors.password}
              </p>
            )}
          </div>

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
            {formik.isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-7 text-sm text-muted">
          ¿No tienes cuenta?{' '}
          <Link
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            to="/register"
          >
            Crear cuenta
          </Link>
        </p>
      </section>
    </main>
  );
}
