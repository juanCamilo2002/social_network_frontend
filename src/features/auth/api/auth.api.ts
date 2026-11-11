import { apiClient } from '../../../shared/api/client';

import type {
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RegisterResponse,
} from '../types/auth.types';

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    '/auth/login',
    credentials,
  );

  return response.data;
}

export async function register(data: RegisterData): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>(
    '/auth/register',
    data,
  );

  return response.data;
}
