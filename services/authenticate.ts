import { authenticateMeResponseSchema } from '@/types/auth';
import { API_ENDPOINTS } from '@/utils/constants';
import { api } from './axios';

export async function authenticateAgent(phoneNumber: string) {
  const response = await api.get(API_ENDPOINTS.AUTHENTICATE_ME, {
    params: { phoneNumber },
  });
  return authenticateMeResponseSchema.parse(response.data);
}
