import { useSnackbarStore } from '../store/snackbarStore';

export const showSnackbar = (
  message: string,
  options?: {
    action?: { label: string; onPress: () => void };
    duration?: number;
    type?: 'success' | 'error' | 'info';
  },
) => {
  useSnackbarStore.getState().showSnackbar(message, options);
};

export const hideSnackbar = () => {
  useSnackbarStore.getState().hideSnackbar();
};
