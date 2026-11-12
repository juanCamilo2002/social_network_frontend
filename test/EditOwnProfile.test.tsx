import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { OwnProfilePage } from '../src/features/users/pages/OwnProfilePage';
import type { UserProfile } from '../src/features/users/types/user-profile.types';

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock('../src/features/auth/api/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    request: requestMock,
  }),
}));

vi.mock('../src/features/auth/context/auth-context', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
  }),
}));

const profile: UserProfile = {
  id: 'user-1',
  nickname: 'juan_dev',
  name: 'Juan',
  lastName: 'Pérez',
  profilePicture: null,
  banner: null,
  biography: 'Biografía original',
};

const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);

const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});

afterAll(() => {
  if (originalShowModal) {
    Object.defineProperty(
      HTMLDialogElement.prototype,
      'showModal',
      originalShowModal,
    );
  } else {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)
      .showModal;
  }

  if (originalClose) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  } else {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  }
});

function renderPage() {
  return render(
    <MemoryRouter>
      <OwnProfilePage />
    </MemoryRouter>,
  );
}

describe('Edición del perfil propio', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('abre el diálogo con los valores actuales y permite cancelar', async () => {
    requestMock.mockResolvedValue(profile);
    const user = userEvent.setup();

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Editar perfil' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Nombre')).toHaveValue('Juan');
    expect(screen.getByLabelText('Apellido')).toHaveValue('Pérez');
    expect(screen.getByLabelText(/Biografía/)).toHaveValue(
      'Biografía original',
    );
    expect(screen.getByLabelText('Nombre')).toHaveFocus();

    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Otro nombre');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Juan Pérez' }),
    ).toBeInTheDocument();

    // Solo se realizó el GET inicial, no un PATCH.
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('valida los campos antes de enviar', async () => {
    requestMock.mockResolvedValue(profile);
    const user = userEvent.setup();

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    );

    await user.clear(screen.getByLabelText('Nombre'));
    await user.clear(screen.getByLabelText('Apellido'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('El nombre es obligatorio.'),
    ).toBeInTheDocument();
    expect(screen.getByText('El apellido es obligatorio.')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('guarda los cambios y muestra la respuesta del backend', async () => {
    const updatedProfile: UserProfile = {
      ...profile,
      name: 'Carlos',
      biography: null,
    };

    requestMock
      .mockResolvedValueOnce(profile)
      .mockResolvedValueOnce(updatedProfile);

    const user = userEvent.setup();

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    );

    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), '  Carlos  ');
    await user.clear(screen.getByLabelText(/Biografía/));

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByRole('heading', { name: 'Carlos Pérez' }),
    ).toBeInTheDocument();

    expect(requestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        url: '/users/me',
        data: {
          name: 'Carlos',
          lastName: 'Pérez',
          biography: null,
        },
        signal: expect.any(AbortSignal),
      }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Perfil actualizado.');
    expect(screen.queryByText('Biografía original')).not.toBeInTheDocument();
  });

  it('mantiene los valores y muestra un error si falla el guardado', async () => {
    requestMock
      .mockResolvedValueOnce(profile)
      .mockRejectedValueOnce(new Error('Error de red'));

    const user = userEvent.setup();

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    );

    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Carlos');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos confirmar los cambios.',
    );

    expect(screen.getByLabelText('Nombre')).toHaveValue('Carlos');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('no permite cerrar con Escape mientras se guarda', async () => {
    let resolveSave!: (value: UserProfile) => void;

    const pendingSave = new Promise<UserProfile>((resolve) => {
      resolveSave = resolve;
    });

    requestMock.mockResolvedValueOnce(profile).mockReturnValueOnce(pendingSave);

    const user = userEvent.setup();

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    );

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    });

    const dialog = screen.getByRole('dialog');

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    await act(async () => {
      resolveSave(profile);
      await pendingSave;
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cierra el diálogo al recibir cancelación cuando no está guardando', async () => {
    requestMock.mockResolvedValue(profile);
    const user = userEvent.setup();

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    );

    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { bubbles: true, cancelable: true }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});
