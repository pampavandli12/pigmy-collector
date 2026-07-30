import { act } from '@testing-library/react-native';
import { useSnackbarStore } from '../store/snackbarStore';
import { hideSnackbar, showSnackbar } from '../utils/snackbar';

beforeEach(() => {
  act(() => useSnackbarStore.setState({ visible: false, message: '' }));
});

test('shows an error snackbar with supplied options', () => {
  act(() => showSnackbar('Network failed', { type: 'error', duration: 5000 }));

  expect(useSnackbarStore.getState()).toMatchObject({
    visible: true,
    message: 'Network failed',
    type: 'error',
    duration: 5000,
  });
});

test('hides the active snackbar', () => {
  act(() => showSnackbar('Message'));
  act(() => hideSnackbar());
  expect(useSnackbarStore.getState().visible).toBe(false);
});
