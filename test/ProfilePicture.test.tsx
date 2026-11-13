import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ProfilePicture } from '../src/features/users/components/ProfilePicture';
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
  biography: null,
};

const updatedProfile: UserProfile = {
  ...profile,
  profilePicture: 'http://localhost:3000/media/profile-pictures/avatar.png',
};

const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);

const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL',
);

const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(
  URL,
  'revokeObjectURL',
);

const createObjectURLMock = vi.fn();
const revokeObjectURLMock = vi.fn();

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

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectURLMock,
  });

  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectURLMock,
  });
});

afterEach(() => {
  cleanup();
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

  if (originalCreateObjectURL) {
    Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
  } else {
    delete (URL as Partial<typeof URL>).createObjectURL;
  }

  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL);
  } else {
    delete (URL as Partial<typeof URL>).revokeObjectURL;
  }
});

function renderOwnProfile() {
  return render(
    <MemoryRouter>
      <OwnProfilePage />
    </MemoryRouter>,
  );
}

describe('Foto de perfil', () => {
  beforeEach(() => {
    requestMock.mockReset();

    createObjectURLMock.mockReset();
    createObjectURLMock.mockReturnValue('blob:preview');

    revokeObjectURLMock.mockReset();
  });

  it('permite ampliar una foto sin mostrar la acción de cambiarla', async () => {
    const user = userEvent.setup();

    render(
      <ProfilePicture
        name="María"
        pictureUrl="https://example.com/maria.png"
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Cambiar foto de perfil' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Ver foto de perfil' }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Foto de perfil' }),
    ).toBeInTheDocument();

    expect(screen.getByAltText('Foto de perfil de María')).toHaveAttribute(
      'src',
      'https://example.com/maria.png',
    );

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('permite agregar una foto cuando el usuario no tiene ninguna', async () => {
    requestMock.mockResolvedValue(profile);
    const user = userEvent.setup();

    renderOwnProfile();

    const changeButton = await screen.findByRole('button', {
      name: 'Cambiar foto de perfil',
    });

    expect(
      screen.queryByRole('button', { name: 'Ver foto de perfil' }),
    ).not.toBeInTheDocument();

    await user.click(changeButton);

    expect(
      screen.getByRole('dialog', { name: 'Cambiar foto de perfil' }),
    ).toBeInTheDocument();
  });

  it('muestra una vista previa y la libera al cancelar', async () => {
    requestMock.mockResolvedValue(profile);
    const user = userEvent.setup();

    renderOwnProfile();

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar foto de perfil' }),
    );

    const file = new File(['contenido'], 'avatar.png', { type: 'image/png' });

    await user.upload(screen.getByLabelText('Seleccionar imagen'), file);

    expect(createObjectURLMock).toHaveBeenCalledWith(file);
    expect(
      screen.getByAltText('Vista previa de la nueva foto de perfil'),
    ).toHaveAttribute('src', 'blob:preview');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:preview');

    // Solo se hizo el GET inicial del perfil.
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('rechaza archivos de tipo no permitido o demasiado grandes', async () => {
    requestMock.mockResolvedValue(profile);
    const user = userEvent.setup({ applyAccept: false });

    renderOwnProfile();

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar foto de perfil' }),
    );

    const input = screen.getByLabelText('Seleccionar imagen');

    await user.upload(
      input,
      new File(['texto'], 'archivo.txt', { type: 'text/plain' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecciona una imagen JPEG, PNG o WebP.',
    );

    const largeFile = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      'grande.png',
      { type: 'image/png' },
    );

    await user.upload(input, largeFile);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La imagen debe tener un tamaño de hasta 5 MiB.',
    );

    expect(screen.getByRole('button', { name: 'Guardar foto' })).toBeDisabled();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('envía el archivo y actualiza el perfil con la respuesta', async () => {
    requestMock
      .mockResolvedValueOnce(profile)
      .mockResolvedValueOnce(updatedProfile);

    const user = userEvent.setup();

    renderOwnProfile();

    const changeButton = await screen.findByRole('button', {
      name: 'Cambiar foto de perfil',
    });

    await user.click(changeButton);

    const file = new File(['contenido'], 'avatar.png', { type: 'image/png' });

    await user.upload(screen.getByLabelText('Seleccionar imagen'), file);
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(2);
    });

    const config = requestMock.mock.calls[1][0] as {
      method: string;
      url: string;
      data: FormData;
      signal: AbortSignal;
      headers: Record<string, unknown>;
    };

    expect(config.method).toBe('POST');
    expect(config.url).toBe('/users/me/profile-picture');
    expect(config.data).toBeInstanceOf(FormData);
    expect(config.data.get('file')).toBe(file);
    expect(config.signal).toBeInstanceOf(AbortSignal);
    expect(config.headers['Content-Type']).toBeUndefined();

    expect(
      await screen.findByText('Foto de perfil actualizada.'),
    ).toBeInTheDocument();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar foto de perfil' })).toBe(
      changeButton,
    );
    expect(
      screen.getByRole('button', { name: 'Ver foto de perfil' }),
    ).toBeInTheDocument();

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:preview');
  });

  it('conserva la vista previa si falla la subida', async () => {
    requestMock
      .mockResolvedValueOnce(profile)
      .mockRejectedValueOnce(new Error('Error de red'));

    const user = userEvent.setup();

    renderOwnProfile();

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar foto de perfil' }),
    );

    const file = new File(['contenido'], 'avatar.png', { type: 'image/png' });

    await user.upload(screen.getByLabelText('Seleccionar imagen'), file);
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos confirmar la subida.',
    );

    expect(
      screen.getByAltText('Vista previa de la nueva foto de perfil'),
    ).toBeInTheDocument();
  });

  it('cancela la petición si la página se desmonta durante la subida', async () => {
    requestMock
      .mockResolvedValueOnce(profile)
      .mockReturnValueOnce(new Promise(() => {}));

    const user = userEvent.setup();
    const { unmount } = renderOwnProfile();

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar foto de perfil' }),
    );

    const file = new File(['contenido'], 'avatar.png', { type: 'image/png' });

    await user.upload(screen.getByLabelText('Seleccionar imagen'), file);
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(2);
    });

    const config = requestMock.mock.calls[1][0] as {
      signal: AbortSignal;
    };

    expect(config.signal.aborted).toBe(false);
    expect(screen.getByRole('button', { name: 'Subiendo…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    unmount();

    expect(config.signal.aborted).toBe(true);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:preview');
  });
});
