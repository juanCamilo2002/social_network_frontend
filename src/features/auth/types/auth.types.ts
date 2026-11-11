export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface RegisterData {
  nickname: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  birthdate?: string;
}

export interface RegisterResponse {
  id: string;
  nickname: string;
  name: string;
  lastName: string;
  email: string;
  createdAt: string;
}
