import {
  setAuthUserUpdatedHandler,
  setUnauthorizedHandler,
} from '@/services/authSession';
import { getStoredUser } from '@/services/authStorage';
import { AuthUser, authUserSchema } from '@/types/auth';
import { PIN_SECURE_STORE_KEY, SECURE_STORE_KEY } from '@/utils/constants';
import { showSnackbar } from '@/utils/snackbar';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'pinSetupRequired'
  | 'locked'
  | 'unlocked';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  authStatus: AuthStatus;
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  getToken: () => string | null;
  getUser: () => AuthUser | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [hasPin, setHasPin] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const [storedUser, storedPin] = await Promise.all([
          getStoredUser(),
          SecureStore.getItemAsync(PIN_SECURE_STORE_KEY),
        ]);
        const hasValidPin = storedPin !== null && /^\d{6}$/.test(storedPin);
        setHasPin(hasValidPin);

        if (storedPin && !hasValidPin) {
          await SecureStore.deleteItemAsync(PIN_SECURE_STORE_KEY);
        }

        if (storedUser) {
          setUser(storedUser);
          setAuthStatus(hasValidPin ? 'locked' : 'pinSetupRequired');
          return;
        }
        setAuthStatus('unauthenticated');
      } catch (error) {
        showSnackbar(
          'Failed to load authentication state. Please log in again.',
        );
        await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    };

    loadAuthState();
  }, []);

  const login = useCallback(async (nextUser: AuthUser) => {
    const validatedUser = authUserSchema.parse(nextUser);

    await SecureStore.setItemAsync(
      SECURE_STORE_KEY,
      JSON.stringify(validatedUser),
    );
    setUser(validatedUser);
    setAuthStatus(hasPin ? 'unlocked' : 'pinSetupRequired');
  }, [hasPin]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    setUser(null);
    setAuthStatus('unauthenticated');
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must contain exactly six digits.');
    }
    await SecureStore.setItemAsync(PIN_SECURE_STORE_KEY, pin);
    setHasPin(true);
    setAuthStatus('unlocked');
  }, []);

  const unlockWithPin = useCallback(async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return false;
    const storedPin = await SecureStore.getItemAsync(PIN_SECURE_STORE_KEY);
    const matches = storedPin === pin;
    if (matches) setAuthStatus('unlocked');
    return matches;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    setAuthUserUpdatedHandler(setUser);

    return () => {
      setUnauthorizedHandler(null);
      setAuthUserUpdatedHandler(null);
    };
  }, [logout]);

  const getToken = useCallback(() => user?.accessToken ?? null, [user]);
  const getUser = useCallback(() => user, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user?.accessToken),
      isUnlocked: authStatus === 'unlocked',
      isLoading: authStatus === 'loading',
      authStatus,
      login,
      logout,
      setupPin,
      unlockWithPin,
      getToken,
      getUser,
    }),
    [authStatus, getToken, getUser, login, logout, setupPin, unlockWithPin, user],
  );

  if (authStatus === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator animating={true} color={theme.colors.primary} />
      </View>
    ); // Show loading
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
