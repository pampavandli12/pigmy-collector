import { AuthUser, authUserSchema } from '@/types/auth';
import { API_ENDPOINTS } from '@/utils/constants';
import { api } from './axios';

export const userLogin = async (
  phoneNumber: string,
  password: string,
): Promise<AuthUser> => {
  try {
    const response = await api.post(API_ENDPOINTS.login, {
      phoneNumber,
      password,
    });

    const result = authUserSchema.safeParse(response.data);

    if (result.success) {
      return result.data;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
