import apiClient from './axios';
import type {
  ApiResponse,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
} from '../types';

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      payload,
    );
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const { data } = await apiClient.post<ApiResponse<RegisterResponse>>(
      '/auth/register',
      payload,
    );
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<{ accessToken: string }> => {
    const { data } = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      '/auth/refresh',
    );
    return data.data;
  },

  getMe: async (): Promise<ApiResponse<AuthResponse['user']>> => {
    const { data } = await apiClient.get<ApiResponse<AuthResponse['user']>>(
      '/auth/me',
    );
    return data;
  },
};
