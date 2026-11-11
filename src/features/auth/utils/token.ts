const TOKEN_KEY = 'social_network_access_token';

function getExpiration(token: string): number | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');

    const paddedPayload = payload.padEnd(
      Math.ceil(payload.length / 4) * 4,
      '=',
    );

    const parsed: unknown = JSON.parse(atob(paddedPayload));

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('exp' in parsed) ||
      typeof parsed.exp !== 'number' ||
      !Number.isFinite(parsed.exp)
    ) {
      return null;
    }

    return parsed.exp * 1000;
  } catch {
    return null;
  }
}

export function getTokenExpiration(token: string): number | null {
  return getExpiration(token);
}

export function isTokenUsable(token: string | null): token is string {
  if (!token) {
    return false;
  }

  const expiration = getExpiration(token);

  return expiration !== null && expiration > Date.now();
}

export function readStoredToken(): string | null {
  const token = readRawStoredToken();

  return isTokenUsable(token) ? token : null;
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenStorageEvent(event: StorageEvent): boolean {
  return event.key === TOKEN_KEY || event.key === null;
}

export function readRawStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
