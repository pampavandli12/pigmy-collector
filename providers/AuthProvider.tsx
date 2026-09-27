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
import { resetRefreshState } from '@/services/authRefresh';
import { initPersistence } from '@/store/persistence';
import { activateAgentStore } from '@/store/store';
import { waitForOutboxIdle } from '@/store/syncCoordinator';
import { stopOutboxSync } from '@/store/syncEngine';
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
import { PIN_SECURE_STORE_KEY } from '@/utils/constants';
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
        // Keep the refs in sync synchronously: a concurrent lock-screen verify
        // may resolve in the same tick and must observe the new user/status
        // (see verifyAgentOnLockScreen callers) rather than the pre-deactivation
        // React state.
        userRef.current = result.activeUser;
        const nextStatus = hasPinRef.current ? 'locked' : 'pinSetupRequired';
        authStatusRef.current = nextStatus;
        setUser(result.activeUser);
        setAuthStatus(nextStatus);
      } else {
        userRef.current = null;
        authStatusRef.current = 'unauthenticated';
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
          // Keep the ref in sync synchronously so the post-verify guard below sees
          // the restored user (React state / the ref-sync effect won't have run
          // yet at that point).
          userRef.current = initialUser;
          setUser(initialUser);

          if (hasValidPin) {
            const status = await verifyAgentOnLockScreen(initialUser);
            // Don't force the lock screen if verification deactivated the account
            // (revoked, or admin-reset via the interceptor) and left no active
            // user — that would strand a null user behind the PIN gate.
            if (status !== 'revoked' && userRef.current) {
              setAuthStatus('locked');
            }
            return;
          }

          setAuthStatus('pinSetupRequired');
          return;
        }
        setAuthStatus('unauthenticated');
      } catch (error) {
        // A transient failure here (SecureStore/MMKV/Crypto hiccup) must NOT
        // destroy the stored session — deleting it would sign the agent out for a
        // recoverable glitch. Corrupt/invalid auth is already dropped defensively
        // by readActiveUser(); here we only surface the error and fall back to the
        // login gate, leaving stored credentials intact for the next launch.
        console.error('Failed to load authentication state:', error);
        showSnackbar(
          'Could not restore your session. Please try again.',
        );
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
        // Skip re-locking if verification deactivated the account (revoked or
        // admin-reset) and there is no longer an active user; deactivateAccount
        // has already routed to the correct screen.
        if (status !== 'revoked' && userRef.current) {
          setAuthStatus('locked');
        }
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
    // Tear down per-agent sync/refresh state before rebinding the store to the
    // next agent so no stale timer or refresh entry fires against it.
    stopOutboxSync();
    resetRefreshState();
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
    stopOutboxSync();
    resetRefreshState();
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
