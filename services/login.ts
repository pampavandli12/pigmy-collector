import { AuthUser } from '@/types/auth';
import { API_ENDPOINTS } from '@/utils/constants';
import { api } from './axios';

export const userLogin = async (
  phoneNumber: string,
  password: string,
): Promise<AuthUser> => {
  const payload = { mobileNumber: phoneNumber, password };
  return api
    .post(API_ENDPOINTS.LOGIN, payload)
    .then((response) => response.data);
};
