import { tokenRefreshResponseSchema } from '@/types/auth';
import { API_BASE_URL, API_ENDPOINTS } from '@/utils/constants';
import type { AxiosStatic } from 'axios';

type RefreshHttpClient = {
  get: (
    url: string,
    config: { params: { refreshToken: string }; headers: Record<string, string> },
  ) => Promise<{ data: unknown }>;
};

export async function refreshAccessToken(
  refreshToken: string,
  client?: RefreshHttpClient,
) {
  const httpClient = client ?? getDefaultClient();
  // The default Axios client is isolated from the interceptors on the app's
  // custom `api` instance, so refresh failures cannot recursively refresh.
  const response = await httpClient.get(
    `${API_BASE_URL}${API_ENDPOINTS.REFRESH_TOKEN}`,
    {
    params: { refreshToken },
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return tokenRefreshResponseSchema.parse(response.data);
}

function getDefaultClient(): AxiosStatic {
  // Keep Axios loading lazy so the refresh service remains independently
  // testable without initializing a platform HTTP adapter.
  const axiosModule = require('axios') as AxiosStatic & { default?: AxiosStatic };
  return axiosModule.default ?? axiosModule;
}
