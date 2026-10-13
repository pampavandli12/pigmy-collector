/**
 * Imperative show/hide helpers for the app-wide snackbar, so non-component
 * code (services, store actions) can surface a message without needing a
 * hook. Thin wrapper over `store/snackbarStore.ts` (zustand — UI-only state).
 */
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
