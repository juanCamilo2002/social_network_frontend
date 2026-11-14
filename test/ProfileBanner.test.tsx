import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ProfileBanner } from '../src/features/users/components/ProfileBanner';

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
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
  }

  if (originalClose) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  } else {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  }
});

describe('ProfileBanner', () => {
  it('permite visualizar el banner sin ofrecer cambiarlo', async () => {
    const user = userEvent.setup();

    render(
      <ProfileBanner
        name="María"
        bannerUrl="https://example.com/banner.png"
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Cambiar banner' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver banner' }));

    expect(
      screen.getByRole('dialog', { name: 'Banner de perfil' }),
    ).toBeInTheDocument();

    expect(screen.getByAltText('Banner de perfil de María')).toHaveAttribute(
      'src',
      'https://example.com/banner.png',
    );

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('permite cambiar el banner cuando no hay imagen', async () => {
    const user = userEvent.setup();
    const onChangeBanner = vi.fn();

    render(
      <ProfileBanner
        name="Juan"
        bannerUrl={null}
        onChangeBanner={onChangeBanner}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Ver banner' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cambiar banner' }));

    expect(onChangeBanner).toHaveBeenCalledTimes(1);
  });

  it('oculta el visor si falla la imagen y permite mostrar una URL nueva', () => {
    const onChangeBanner = vi.fn();

    const { container, rerender } = render(
      <ProfileBanner
        name="Juan"
        bannerUrl="https://example.com/anterior.png"
        onChangeBanner={onChangeBanner}
      />,
    );

    const image = container.querySelector('img');

    if (!image) {
      throw new Error('No se encontró la imagen del banner');
    }

    fireEvent.error(image);

    expect(
      screen.queryByRole('button', { name: 'Ver banner' }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Cambiar banner' }),
    ).toBeInTheDocument();

    rerender(
      <ProfileBanner
        name="Juan"
        bannerUrl="https://example.com/nuevo.png"
        onChangeBanner={onChangeBanner}
      />,
    );

    expect(screen.getByRole('button', { name: 'Ver banner' })).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/nuevo.png',
    );
  });
});