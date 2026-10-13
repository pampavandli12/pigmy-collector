/** Renders the single app-wide snackbar; mounted once in `app/_layout.tsx` and driven entirely by `store/snackbarStore.ts`. */
import { Snackbar } from 'react-native-paper';
import { useSnackbarStore } from '../store/snackbarStore';

export const AppSnackbar = () => {
  const { visible, message, action, duration, hideSnackbar } =
    useSnackbarStore();

  return (
    <Snackbar
      visible={visible}
      onDismiss={hideSnackbar}
      action={action}
      duration={duration}
    >
      {message}
    </Snackbar>
  );
};
