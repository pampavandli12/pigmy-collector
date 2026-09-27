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
  updateStoredAgentProfile,
} from '@/services/authStorage';
import { authenticateAgent } from '@/services/authenticate';
import { initPersistence } from '@/store/persistence';
import { activateAgentStore } from '@/store/store';
import { waitForOutboxIdle } from '@/store/syncCoordinator';
import {
  AgentAccountSummary,
  AuthUser,
  authUserSchema,
} from '@/types/auth';
import {
  assertPinAvailable,
  clearPinAttempts,
  hashPin,
  isUsableStoredPin,
  recordFailedPinAttempt,
  storedPinMatches,
} from '@/utils/appPin';
import { PIN_SECURE_STORE_KEY, SECURE_STORE_KEY } from '@/utils/constants';
import { showSnackbar } from '@/utils/snackbar';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, View } from 'react-native';
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
  reason: 'expired' | 'manual' | 'revoked';
}

const AuthContext = createContext<AuthContextType | null>(null);

// Grace window for the app-PIN auto-lock. Transient backgrounds — Bluetooth /
// permission system dialogs during printer setup, for example — return well
// within this window and must not force a PIN re-entry mid-flow. Only a real
// app switch (longer absence) re-locks.
const AUTO_LOCK_GRACE_MS = 3000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accounts, setAccounts] = useState<AgentAccountSummary[]>([]);
  const [sessionNotice, setSessionNotice] = useState<SessionNotice | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [hasPin, setHasPin] = useState(false);
  const theme = useTheme();
  const authStatusRef = useRef(authStatus);
  const userRef = useRef(user);
  const hasPinRef = useRef(hasPin);
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    authStatusRef.current = authStatus;
  }, [authStatus]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    hasPinRef.current = hasPin;
  }, [hasPin]);

  const deactivateAccount = useCallback(
    async (
      accountId: string,
      reason: SessionNotice['reason'],
      activeUserHint?: AuthUser,
    ) => {
      const result = await deactivateStoredAccount(accountId, activeUserHint);
      setAccounts(await getStoredAccounts());
      if (!result.wasActive || !result.disabledAccount) return 'ignored' as const;

      if (result.activeUser) {
        activateAgentStore(result.activeUser);
        setUser(result.activeUser);
        setAuthStatus(hasPinRef.current ? 'locked' : 'pinSetupRequired');
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
      }
      setSessionNotice({
        expiredAgentName: result.disabledAccount.agentName,
        replacementAgentName: result.activeUser?.agentName ?? null,
        reason,
      });
      return result.activeUser ? ('fallback' as const) : ('signedOut' as const);
    },
    [],
  );

  const verifyAgentSession = useCallback(
    async (activeUser: AuthUser): Promise<'active' | 'revoked'> => {
      const authStatus = await authenticateAgent(activeUser.phoneNumber);
      const accountId = getAgentAccountId(activeUser);
      const updatedUser = await updateStoredAgentProfile(accountId, {
        limitAmount: authStatus.limitAmount,
        lastDepositDate: authStatus.lastDepositDate,
        graceDays: authStatus.graceDays,
      });

      setUser(updatedUser);
      activateAgentStore(updatedUser);
      setAccounts(await getStoredAccounts());

      if (authStatus.isAgentRevoked) {
        const outcome = await deactivateAccount(accountId, 'revoked', updatedUser);
        return outcome === 'ignored' ? 'active' : 'revoked';
      }

      return 'active';
    },
    [deactivateAccount],
  );

  const verifyAgentOnLockScreen = useCallback(
    async (activeUser: AuthUser) => {
      try {
        return await verifyAgentSession(activeUser);
      } catch {
        showSnackbar(
          'Unable to verify agent status. You can still unlock with your PIN.',
          { type: 'error' },
        );
        return 'active' as const;
      }
    },
    [verifyAgentSession],
  );

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        await initPersistence();
        const [storedUser, storedPin] = await Promise.all([
          getStoredUser(),
          SecureStore.getItemAsync(PIN_SECURE_STORE_KEY),
        ]);
        const storedAccounts = await getStoredAccounts();
        setAccounts(storedAccounts);
        const hasValidPin = isUsableStoredPin(storedPin);
        hasPinRef.current = hasValidPin;
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

          if (hasValidPin) {
            const status = await verifyAgentOnLockScreen(initialUser);
            if (status !== 'revoked') setAuthStatus('locked');
            return;
          }

          setAuthStatus('pinSetupRequired');
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
  }, [verifyAgentOnLockScreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'background' &&
        hasPinRef.current &&
        userRef.current &&
        authStatusRef.current === 'unlocked'
      ) {
        // Defer the decision to lock until we come back: record when we left.
        // A transient background (e.g. a Bluetooth/permission system dialog)
        // returns within AUTO_LOCK_GRACE_MS and must not force a PIN re-entry.
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (nextState !== 'active' || !hasPinRef.current || !userRef.current) {
        return;
      }

      const backgroundedAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;

      const lockAfterAbsence =
        authStatusRef.current === 'unlocked' &&
        backgroundedAt !== null &&
        Date.now() - backgroundedAt >= AUTO_LOCK_GRACE_MS;

      // Nothing to do for a brief return while unlocked; only lock after a real
      // absence, or re-verify when we were already locked.
      if (!lockAfterAbsence && authStatusRef.current !== 'locked') {
        return;
      }

      const activeUser = userRef.current;
      setAuthStatus('loading');
      void verifyAgentOnLockScreen(activeUser).then((status) => {
        if (status !== 'revoked') setAuthStatus('locked');
      });
    });

    return () => subscription.remove();
  }, [verifyAgentOnLockScreen]);

  const login = useCallback(async (nextUser: AuthUser) => {
    const validatedUser = authUserSchema.parse(nextUser);

    const isFirstAccount = accounts.length === 0;
    await initPersistence();
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
      await initPersistence();
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
    await initPersistence();
    const nextUser = await activateStoredAccount(accountId);
    activateAgentStore(nextUser);
    setUser(nextUser);
    setAccounts(await getStoredAccounts());
    setAuthStatus('unlocked');
  }, []);

  const logout = useCallback(async () => {
    if (!user) return;
    await waitForOutboxIdle();
    await deactivateAccount(getAgentAccountId(user), 'manual', user);
  }, [deactivateAccount, user]);

  const setupPin = useCallback(async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must contain exactly six digits.');
    }
    await SecureStore.setItemAsync(PIN_SECURE_STORE_KEY, await hashPin(pin));
    hasPinRef.current = true;
    setHasPin(true);
    setAuthStatus('unlocked');
  }, []);

  const unlockWithPin = useCallback(async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return false;
    await assertPinAvailable();
    const storedPin = await SecureStore.getItemAsync(PIN_SECURE_STORE_KEY);
    if (!(await storedPinMatches(storedPin, pin))) {
      await recordFailedPinAttempt();
      return false;
    }
    await clearPinAttempts();
    setAuthStatus('unlocked');
    return true;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async (accountId) => {
      await deactivateAccount(accountId, 'expired');
    });
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
