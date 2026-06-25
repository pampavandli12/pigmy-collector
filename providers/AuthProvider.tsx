import { setUnauthorizedHandler } from '@/services/authSession';
import { AuthUser, authUserSchema } from '@/types/auth';
import { SECURE_STORE_KEY } from '@/utils/constants';
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

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
  getUser: () => AuthUser | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync(SECURE_STORE_KEY);

        if (!storedUser) {
          return;
        }

        const parsedUser: unknown = JSON.parse(storedUser);
        const result = authUserSchema.safeParse(parsedUser);

        if (result.success) {
          setUser(result.data);
          return;
        }

        await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
      } catch (error) {
        showSnackbar(
          'Failed to load authentication state. Please log in again.',
        );
        await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
      } finally {
        setIsLoading(false);
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
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const getToken = useCallback(() => user?.token ?? null, [user]);
  const getUser = useCallback(() => user, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user?.token),
      isLoading,
      login,
      logout,
      getToken,
      getUser,
    }),
    [getToken, getUser, isLoading, login, logout, user],
  );

  if (isLoading) {
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
