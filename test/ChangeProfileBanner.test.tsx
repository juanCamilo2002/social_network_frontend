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

import { OwnProfilePage } from '../src/features/users/pages/OwnProfilePage';
import type { UserProfile } from '../src/features/users/types/user-profile.types';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

const requestWithPosts = (config: { url?: string }) =>
  config.url === '/posts' ? Promise.resolve([]) : requestMock(config);

vi.mock('../src/features/auth/api/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({ request: requestWithPosts }),
}));

vi.mock('../src/features/auth/context/auth-context', () => ({
  useAuth: () => ({ accessToken: 'test-token' }),
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

const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
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

afterEach(() => cleanup());

afterAll(() => {
  if (originalShowModal)
    Object.defineProperty(
      HTMLDialogElement.prototype,
      'showModal',
      originalShowModal,
    );
  else
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)
      .showModal;
  if (originalClose)
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  if (originalCreate)
    Object.defineProperty(URL, 'createObjectURL', originalCreate);
  else delete (URL as Partial<typeof URL>).createObjectURL;
  if (originalRevoke)
    Object.defineProperty(URL, 'revokeObjectURL', originalRevoke);
  else delete (URL as Partial<typeof URL>).revokeObjectURL;
});

function renderOwnProfile() {
  return render(
    <MemoryRouter>
      <OwnProfilePage />
    </MemoryRouter>,
  );
}

describe('Cambiar banner de perfil', () => {
  beforeEach(() => {
    requestMock.mockReset();
    createObjectURLMock.mockReset().mockReturnValue('blob:banner-preview');
    revokeObjectURLMock.mockReset();
  });

  it('permite abrir el diálogo cuando no existe un banner', async () => {
    requestMock.mockResolvedValueOnce(profile);
    const user = userEvent.setup();
    renderOwnProfile();

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar banner' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Cambiar banner' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ver banner' }),
    ).not.toBeInTheDocument();
  });

  it('muestra la vista previa y libera su URL al cancelar', async () => {
    requestMock.mockResolvedValueOnce(profile);
    const user = userEvent.setup();
    renderOwnProfile();

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar banner' }),
    );
    const file = new File(['contenido'], 'banner.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Seleccionar imagen'), file);

    expect(createObjectURLMock).toHaveBeenCalledWith(file);
    expect(
      screen.getByAltText('Vista previa del nuevo banner'),
    ).toHaveAttribute('src', 'blob:banner-preview');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:banner-preview');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('rechaza archivos de tipo no permitido, vacíos o demasiado grandes', async () => {
    requestMock.mockResolvedValueOnce(profile);
    const user = userEvent.setup({ applyAccept: false });
    renderOwnProfile();
    await user.click(
      await screen.findByRole('button', { name: 'Cambiar banner' }),
    );
    const input = screen.getByLabelText('Seleccionar imagen');

    await user.upload(
      input,
      new File(['texto'], 'archivo.txt', { type: 'text/plain' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecciona una imagen JPEG, PNG o WebP.',
    );
    await user.upload(input, new File([], 'vacio.png', { type: 'image/png' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La imagen debe tener un tamaño de hasta 5 MiB.',
    );
    await user.upload(
      input,
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', {
        type: 'image/png',
      }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La imagen debe tener un tamaño de hasta 5 MiB.',
    );
    expect(
      screen.getByRole('button', { name: 'Guardar banner' }),
    ).toBeDisabled();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('envía el archivo y actualiza el perfil con la respuesta', async () => {
    const updatedProfile: UserProfile = {
      ...profile,
      banner: 'https://example.com/banner.png',
    };
    requestMock
      .mockResolvedValueOnce(profile)
      .mockResolvedValueOnce(updatedProfile);
    const user = userEvent.setup();
    renderOwnProfile();
    await user.click(
      await screen.findByRole('button', { name: 'Cambiar banner' }),
    );
    const file = new File(['contenido'], 'banner.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Seleccionar imagen'), file);
    await user.click(screen.getByRole('button', { name: 'Guardar banner' }));

    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(2));
    const config = requestMock.mock.calls[1][0] as {
      method: string;
      url: string;
      data: FormData;
      signal: AbortSignal;
      headers: Record<string, unknown>;
    };
    expect(config.method).toBe('POST');
    expect(config.url).toBe('/users/me/profile-banner');
    expect(config.data.get('file')).toBe(file);
    expect(config.signal).toBeInstanceOf(AbortSignal);
    expect(config.headers['Content-Type']).toBeUndefined();
    expect(await screen.findByText('Banner actualizado.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver banner' }),
    ).toBeInTheDocument();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:banner-preview');
  });

  it('conserva la vista previa si falla la subida', async () => {
    requestMock
      .mockResolvedValueOnce(profile)
      .mockRejectedValueOnce(new Error('Error de red'));
    const user = userEvent.setup();
    renderOwnProfile();
    await user.click(
      await screen.findByRole('button', { name: 'Cambiar banner' }),
    );
    await user.upload(
      screen.getByLabelText('Seleccionar imagen'),
      new File(['contenido'], 'banner.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: 'Guardar banner' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos confirmar la subida.',
    );
    expect(
      screen.getByAltText('Vista previa del nuevo banner'),
    ).toBeInTheDocument();
  });

  it('cancela la petición si la página se desmonta durante la subida', async () => {
    requestMock
      .mockResolvedValueOnce(profile)
      .mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    const { unmount } = renderOwnProfile();
    await user.click(
      await screen.findByRole('button', { name: 'Cambiar banner' }),
    );
    await user.upload(
      screen.getByLabelText('Seleccionar imagen'),
      new File(['contenido'], 'banner.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: 'Guardar banner' }));

    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(2));
    const config = requestMock.mock.calls[1][0] as { signal: AbortSignal };
    expect(config.signal.aborted).toBe(false);
    expect(screen.getByRole('button', { name: 'Subiendo…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    unmount();
    expect(config.signal.aborted).toBe(true);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:banner-preview');
  });
});
