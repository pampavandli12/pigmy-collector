import { AuthUser, loginResponseSchema } from '@/types/auth';
import { API_ENDPOINTS } from '@/utils/constants';
import { api } from './axios';

export const userLogin = async (
  phoneNumber: string,
  password: string,
): Promise<AuthUser> => {
  const payload = { mobileNumber: phoneNumber, password };
  const response = await api.post(API_ENDPOINTS.LOGIN, payload);
  return loginResponseSchema.parse(response.data);
};
