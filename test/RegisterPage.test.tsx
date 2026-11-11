import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../src/features/auth/api/auth.api';
import { AuthContext } from '../src/features/auth/context/auth-context';
import { LoginPage } from '../src/features/auth/pages/LoginPage';
import { RegisterPage } from '../src/features/auth/pages/RegisterPage';
import type { RegisterResponse } from '../src/features/auth/types/auth.types';

vi.mock('../src/features/auth/api/auth.api', () => ({
  register: vi.fn(),
}));

const registeredUser: RegisterResponse = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nickname: 'juan_dev',
  name: 'Juan',
  lastName: 'Pérez',
  email: 'juan@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderRegister(isAuthenticated = false) {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthContext.Provider
        value={{
          accessToken: null,
          isAuthenticated,
          signIn: vi.fn(),
          signOut: vi.fn(),
        }}
      >
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>Pantalla de inicio</h1>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return user;
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nickname'), 'juan_dev');
  await user.type(screen.getByLabelText('Nombre'), 'Juan');
  await user.type(screen.getByLabelText('Apellido'), 'Pérez');
  await user.type(
    screen.getByLabelText('Correo electrónico'),
    'juan@example.com',
  );
  await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(register).mockResolvedValue(registeredUser);
  });

  it('muestra los campos obligatorios sin enviar la petición', async () => {
    const user = renderRegister();

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('El nickname es obligatorio'),
    ).toBeInTheDocument();
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El apellido es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El correo es obligatorio')).toBeInTheDocument();
    expect(
      screen.getByText('La contraseña es obligatoria'),
    ).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('rechaza un nickname inválido', async () => {
    const user = renderRegister();
    await fillRequiredFields(user);
    await user.clear(screen.getByLabelText('Nickname'));
    await user.type(screen.getByLabelText('Nickname'), 'juan-dev');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText(
        'Solo puede contener letras, números y guiones bajos',
      ),
    ).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('registra sin fecha de nacimiento y muestra la confirmación en login', async () => {
    const user = renderRegister();
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        nickname: 'juan_dev',
        name: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        password: 'clave-segura',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cuenta creada. Ya puedes iniciar sesión.',
    );
    expect(
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
  });

  it('incluye la fecha de nacimiento cuando se proporciona', async () => {
    const user = renderRegister();
    await fillRequiredFields(user);
    await user.type(
      screen.getByLabelText('Fecha de nacimiento (opcional)'),
      '1998-05-20',
    );

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        nickname: 'juan_dev',
        name: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        password: 'clave-segura',
        birthdate: '1998-05-20',
      });
    });
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('muestra un mensaje si el correo o nickname ya existen', async () => {
    vi.mocked(register).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    });
    const user = renderRegister();
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o el nickname ya están registrados.',
    );
    expect(
      screen.getByRole('heading', { name: 'Crear cuenta' }),
    ).toBeInTheDocument();
  });

  it('muestra un error general si falla la conexión', async () => {
    vi.mocked(register).mockRejectedValueOnce(new Error('Network error'));
    const user = renderRegister();
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible crear la cuenta. Inténtalo de nuevo.',
    );
  });

  it('deshabilita el botón mientras se procesa el registro', async () => {
    let resolveRequest!: (value: RegisterResponse) => void;
    const pendingRequest = new Promise<RegisterResponse>((resolve) => {
      resolveRequest = resolve;
    });
    vi.mocked(register).mockReturnValueOnce(pendingRequest);
    const user = renderRegister();
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByRole('button', { name: 'Creando cuenta…' }),
    ).toBeDisabled();

    await act(async () => {
      resolveRequest(registeredUser);
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cuenta creada.',
    );
  });

  it('redirige al inicio si el usuario ya está autenticado', async () => {
    renderRegister(true);

    expect(
      await screen.findByRole('heading', { name: 'Pantalla de inicio' }),
    ).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});
