import { notifyUnauthorized, setUnauthorizedHandler } from '../services/authSession';

afterEach(() => setUnauthorizedHandler(null));

test('notifies the registered unauthorized handler', async () => {
  const handler = jest.fn();
  setUnauthorizedHandler(handler);
  await notifyUnauthorized();
  expect(handler).toHaveBeenCalledTimes(1);
});

test('allows notification when no handler is registered', async () => {
  setUnauthorizedHandler(null);
  await expect(notifyUnauthorized()).resolves.toBeUndefined();
});
