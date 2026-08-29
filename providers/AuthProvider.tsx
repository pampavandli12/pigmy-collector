import {
  setAuthUserUpdatedHandler,
  setUnauthorizedHandler,
} from '@/services/authSession';
import {
  activateStoredAccount,
  deactivateStoredAccount,
  getAgentAccountId,
  getStoredAccounts,
  getStoredUser,
  saveAndActivateAccount,
} from '@/services/authStorage';
import { activateAgentStore } from '@/store/store';
import { waitForOutboxIdle } from '@/store/syncCoordinator';
import {
  AgentAccountSummary,
  AuthUser,
  authUserSchema,
} from '@/types/auth';
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
  accounts: AgentAccountSummary[];
  sessionNotice: SessionNotice | null;
  isAuthenticated: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  authStatus: AuthStatus;
  login: (user: AuthUser) => Promise<void>;
  reauthenticateAccount: (accountId: string, user: AuthUser) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  logout: () => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  getToken: () => string | null;
  getUser: () => AuthUser | null;
  dismissSessionNotice: () => void;
}

export interface SessionNotice {
  expiredAgentName: string;
  replacementAgentName: string | null;
  reason: 'expired' | 'manual';
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accounts, setAccounts] = useState<AgentAccountSummary[]>([]);
  const [sessionNotice, setSessionNotice] = useState<SessionNotice | null>(null);
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
        const storedAccounts = await getStoredAccounts();
        setAccounts(storedAccounts);
        const hasValidPin = storedPin !== null && /^\d{6}$/.test(storedPin);
        setHasPin(hasValidPin);

        if (storedPin && !hasValidPin) {
          await SecureStore.deleteItemAsync(PIN_SECURE_STORE_KEY);
        }

        let initialUser = storedUser;
        if (!initialUser) {
          const fallback = storedAccounts
            .filter((account) => account.status === 'available')
            .sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
          if (fallback) initialUser = await activateStoredAccount(fallback.accountId);
        }

        if (initialUser) {
          activateAgentStore(initialUser, true);
          setUser(initialUser);
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

    const isFirstAccount = accounts.length === 0;
    await saveAndActivateAccount(validatedUser);
    activateAgentStore(validatedUser, isFirstAccount);
    setAccounts(await getStoredAccounts());
    setUser(validatedUser);
    setAuthStatus(hasPin ? 'unlocked' : 'pinSetupRequired');
  }, [accounts.length, hasPin]);

  const reauthenticateAccount = useCallback(
    async (accountId: string, nextUser: AuthUser) => {
      const validated = authUserSchema.parse(nextUser);
      if (getAgentAccountId(validated) !== accountId) {
        throw new Error('The credentials belong to a different agent account.');
      }
      await saveAndActivateAccount(validated);
      activateAgentStore(validated);
      setAccounts(await getStoredAccounts());
      setUser(validated);
      setAuthStatus(hasPin ? 'unlocked' : 'pinSetupRequired');
    },
    [hasPin],
  );

  const switchAccount = useCallback(async (accountId: string) => {
    await waitForOutboxIdle();
    const nextUser = await activateStoredAccount(accountId);
    activateAgentStore(nextUser);
    setUser(nextUser);
    setAccounts(await getStoredAccounts());
    setAuthStatus('unlocked');
  }, []);

  const deactivateAccount = useCallback(
    async (
      accountId: string,
      reason: SessionNotice['reason'],
      activeUserHint?: AuthUser,
    ) => {
      const result = await deactivateStoredAccount(accountId, activeUserHint);
      setAccounts(await getStoredAccounts());
      if (!result.wasActive || !result.disabledAccount) return;

      if (result.activeUser) {
        activateAgentStore(result.activeUser);
        setUser(result.activeUser);
        setAuthStatus('unlocked');
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
      }
      setSessionNotice({
        expiredAgentName: result.disabledAccount.agentName,
        replacementAgentName: result.activeUser?.agentName ?? null,
        reason,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    if (!user) return;
    await waitForOutboxIdle();
    await deactivateAccount(getAgentAccountId(user), 'manual', user);
  }, [deactivateAccount, user]);

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
    setUnauthorizedHandler((accountId) => deactivateAccount(accountId, 'expired'));
    setAuthUserUpdatedHandler((accountId, nextUser) => {
      setUser((current) =>
        current && getAgentAccountId(current) === accountId ? nextUser : current,
      );
      void getStoredAccounts().then(setAccounts);
    });

    return () => {
      setUnauthorizedHandler(null);
      setAuthUserUpdatedHandler(null);
    };
  }, [deactivateAccount]);

  const getToken = useCallback(() => user?.accessToken ?? null, [user]);
  const getUser = useCallback(() => user, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accounts,
      sessionNotice,
      isAuthenticated: Boolean(user?.accessToken),
      isUnlocked: authStatus === 'unlocked',
      isLoading: authStatus === 'loading',
      authStatus,
      login,
      reauthenticateAccount,
      switchAccount,
      logout,
      setupPin,
      unlockWithPin,
      getToken,
      getUser,
      dismissSessionNotice: () => setSessionNotice(null),
    }),
    [accounts, authStatus, getToken, getUser, login, logout, reauthenticateAccount, sessionNotice, setupPin, switchAccount, unlockWithPin, user],
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
