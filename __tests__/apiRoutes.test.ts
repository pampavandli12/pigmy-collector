import { API_ENDPOINTS } from '../utils/constants';
import { isPublicAuthRoute } from '../utils/apiRoutes';

test('treats login and refresh routes as public', () => {
  expect(isPublicAuthRoute(API_ENDPOINTS.LOGIN)).toBe(true);
  expect(isPublicAuthRoute(API_ENDPOINTS.REFRESH_TOKEN)).toBe(true);
});

test('does not treat protected routes as public', () => {
  expect(isPublicAuthRoute(API_ENDPOINTS.FETCH_CUSTOMERS)).toBe(false);
  expect(isPublicAuthRoute(API_ENDPOINTS.ADD_TRANSACTION)).toBe(false);
});

test('ignores query strings when checking public routes', () => {
  expect(
    isPublicAuthRoute(`${API_ENDPOINTS.FETCH_CUSTOMERS}?agentCode=1&bankCode=B`),
  ).toBe(false);
});
