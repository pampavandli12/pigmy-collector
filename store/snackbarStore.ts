import { create } from 'zustand';

interface SnackbarState {
  visible: boolean;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

interface SnackbarActions {
  showSnackbar: (message: string, options?: Partial<SnackbarState>) => void;
  hideSnackbar: () => void;
}

type SnackbarStore = SnackbarState & SnackbarActions;

export const useSnackbarStore = create<SnackbarStore>((set) => ({
  visible: false,
  message: '',
  action: undefined,
  duration: 4000,
  type: 'info',
  showSnackbar: (message, options = {}) => {
    // Reset to defaults on every call so a previous message's type/action/duration
    // can't leak into this one (e.g. a success toast rendering with the prior
    // error's red styling or a stale action handler).
    set({
      visible: true,
      message,
      action: undefined,
      duration: 4000,
      type: 'info',
      ...options,
    });
  },
  hideSnackbar: () => {
    set({ visible: false, action: undefined });
  },
}));
