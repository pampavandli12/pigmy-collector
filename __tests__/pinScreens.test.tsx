const mockSetupPin = jest.fn();
const mockUnlockWithPin = jest.fn();

jest.mock('../providers/AuthProvider', () => {
  class SessionEndedError extends Error {
    constructor() {
      super('Your session has ended. Please log in again.');
      this.name = 'SessionEndedError';
    }
  }
  return {
    SessionEndedError,
    useAuth: () => ({
      setupPin: mockSetupPin,
      unlockWithPin: mockUnlockWithPin,
    }),
  };
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SessionEndedError } from '../providers/AuthProvider';
import PinSetup from '../app/pinSetup';
import PinUnlock from '../app/pinUnlock';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockSetupPin.mockResolvedValue(undefined);
  mockUnlockWithPin.mockResolvedValue(false);
});

test('requires matching six-digit PINs during setup', async () => {
  const screen = render(<PinSetup />, { wrapper });
  fireEvent.changeText(screen.getByTestId('pin-setup-input'), '123456');
  fireEvent.changeText(screen.getByTestId('pin-confirm-input'), '654321');
  fireEvent.press(screen.getByText('Save PIN'));
  expect(await screen.findByText('PINs do not match.')).toBeTruthy();
  expect(mockSetupPin).not.toHaveBeenCalled();

  fireEvent.changeText(screen.getByTestId('pin-confirm-input'), '123456');
  fireEvent.press(screen.getByText('Save PIN'));
  await waitFor(() => expect(mockSetupPin).toHaveBeenCalledWith('123456'));
});

test('allows retry after an incorrect PIN', async () => {
  const screen = render(<PinUnlock />, { wrapper });
  fireEvent.changeText(screen.getByTestId('pin-unlock-input'), '000000');
  fireEvent.press(screen.getByText('Unlock'));
  expect(await screen.findByText('Incorrect PIN. Please try again.')).toBeTruthy();
  expect(mockUnlockWithPin).toHaveBeenCalledWith('000000');

  mockUnlockWithPin.mockResolvedValueOnce(true);
  fireEvent.changeText(screen.getByTestId('pin-unlock-input'), '123456');
  fireEvent.press(screen.getByText('Unlock'));
  await waitFor(() => expect(mockUnlockWithPin).toHaveBeenCalledWith('123456'));
});

test('clears the PIN without an "incorrect PIN" message when the session has ended', async () => {
  mockUnlockWithPin.mockRejectedValueOnce(new SessionEndedError());
  const screen = render(<PinUnlock />, { wrapper });
  const input = screen.getByTestId('pin-unlock-input');
  fireEvent.changeText(input, '123456');
  fireEvent.press(screen.getByText('Unlock'));

  await waitFor(() => expect(mockUnlockWithPin).toHaveBeenCalledWith('123456'));
  await waitFor(() => expect(input.props.value).toBe(''));
  expect(screen.queryByText('Incorrect PIN. Please try again.')).toBeNull();
  expect(
    screen.queryByText('Unable to verify your PIN. Please try again.'),
  ).toBeNull();
});
