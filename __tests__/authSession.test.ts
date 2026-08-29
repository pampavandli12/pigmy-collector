import {
  notifyAuthUserUpdated,
  notifyUnauthorized,
  setAuthUserUpdatedHandler,
  setUnauthorizedHandler,
} from '../services/authSession';

afterEach(() => {
  setUnauthorizedHandler(null);
  setAuthUserUpdatedHandler(null);
});

test('notifies the registered unauthorized handler', async () => {
  const handler = jest.fn();
  setUnauthorizedHandler(handler);
  await notifyUnauthorized('B:1');
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith('B:1');
});

test('allows notification when no handler is registered', async () => {
  setUnauthorizedHandler(null);
  await expect(notifyUnauthorized('B:1')).resolves.toBeUndefined();
});

test('notifies the provider when refreshed user data is available', () => {
  const handler = jest.fn();
  const user = {
    agentCode: 1, agentName: 'Agent', bankCode: 'B', bankName: 'Bank Name',
    phoneNumber: '9876543210', lastDepositDate: null, limitAmount: null,
    graceDays: null, accessToken: 'new-access', refreshToken: 'new-refresh',
  };
  setAuthUserUpdatedHandler(handler);
  notifyAuthUserUpdated('B:1', user);
  expect(handler).toHaveBeenCalledWith('B:1', user);
});
