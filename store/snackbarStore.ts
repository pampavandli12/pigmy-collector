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
    set({
      visible: true,
      message,
      ...options,
    });
  },
  hideSnackbar: () => {
    set({ visible: false });
  },
}));
