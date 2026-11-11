import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext } from '../src/features/auth/context/auth-context';
import { LoginPage } from '../src/features/auth/pages/LoginPage';

function renderLogin(signIn = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext.Provider
        value={{
          accessToken: null,
          isAuthenticated: false,
          signIn,
          signOut: vi.fn(),
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>Pantalla de inicio</h1>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return { user, signIn };
}

describe('LoginPage', () => {
  it('muestra errores si se envía el formulario vacío', async () => {
    const { user, signIn } = renderLogin();

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText('El correo electrónico es obligatorio'),
    ).toBeInTheDocument();

    expect(
      await screen.findByText('La contraseña es obligatoria'),
    ).toBeInTheDocument();

    expect(signIn).not.toHaveBeenCalled();
  });

  it('rechaza un correo inválido', async () => {
    const { user, signIn } = renderLogin();

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'correo-invalido',
    );

    await user.type(screen.getByLabelText('Contraseña'), 'una-clave');

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText('Ingresa un correo electrónico válido'),
    ).toBeInTheDocument();

    expect(signIn).not.toHaveBeenCalled();
  });

  it('envía las credenciales y navega al inicio', async () => {
    const { user, signIn } = renderLogin();

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'juan@example.com',
    );

    await user.type(screen.getByLabelText('Contraseña'), 'una-clave');

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        email: 'juan@example.com',
        password: 'una-clave',
      });
    });

    expect(
      await screen.findByRole('heading', { name: 'Pantalla de inicio' }),
    ).toBeInTheDocument();
  });

  it('muestra un mensaje si las credenciales son incorrectas', async () => {
    const signIn = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    const { user } = renderLogin(signIn);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'juan@example.com',
    );

    await user.type(screen.getByLabelText('Contraseña'), 'clave-incorrecta');

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña son incorrectos.',
    );
  });

  it('muestra un error general si falla la conexión', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { user } = renderLogin(signIn);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'juan@example.com',
    );

    await user.type(screen.getByLabelText('Contraseña'), 'una-clave');

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible iniciar sesión. Inténtalo de nuevo.',
    );
  });
});
