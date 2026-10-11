import { authenticateAgent } from "@/services/authenticate";
import { resetRefreshState } from "@/services/authRefresh";
import {
  setAuthUserUpdatedHandler,
  setUnauthorizedHandler,
} from "@/services/authSession";
import {
  activateStoredAccount,
  deactivateStoredAccount,
  getAgentAccountId,
  getStoredAccounts,
  getStoredUser,
  saveAndActivateAccount,
  updateStoredAgentProfile,
} from "@/services/authStorage";
import { initPersistence } from "@/store/persistence";
import { activateAgentStore } from "@/store/store";
import { waitForOutboxIdle } from "@/store/syncCoordinator";
import { stopOutboxSync } from "@/store/syncEngine";
import { AgentAccountSummary, AuthUser, authUserSchema } from "@/types/auth";
import {
  assertPinAvailable,
  clearPinAttempts,
  isUsableStoredPin,
  recordFailedPinAttempt,
  storedPinMatches,
  storePin,
} from "@/utils/appPin";
import { PIN_SECURE_STORE_KEY } from "@/utils/constants";
import { showSnackbar } from "@/utils/snackbar";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "pinSetupRequired"
  | "locked"
  | "unlocked";

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
  // Suppresses the auto-lock around a trusted, user-initiated system UI
  // handoff (camera, photo library, etc.) that backgrounds the app for an
  // unbounded amount of time — see the AppState listener below. Callers must
  // call endTrustedHandoff() in a `finally` so a thrown/cancelled handoff
  // never leaves the lock permanently suppressed.
  beginTrustedHandoff: () => void;
  endTrustedHandoff: () => void;
}

export interface SessionNotice {
  expiredAgentName: string;
  replacementAgentName: string | null;
  reason: "expired" | "manual" | "revoked";
}

// Thrown by unlockWithPin when the PIN itself was correct but the agent's
// server-side session has already ended (revoked, or refresh permanently
// failed) as part of the same unlock attempt. By the time this is thrown,
// deactivateAccount has already moved authStatus on and set sessionNotice —
// callers should not treat this as "incorrect PIN".
export class SessionEndedError extends Error {
  constructor() {
    super("Your session has ended. Please log in again.");
    this.name = "SessionEndedError";
  }
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
  const [sessionNotice, setSessionNotice] = useState<SessionNotice | null>(
    null,
  );
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [hasPin, setHasPin] = useState(false);
  const theme = useTheme();
  const authStatusRef = useRef(authStatus);
  const userRef = useRef(user);
  const hasPinRef = useRef(hasPin);
  const backgroundedAtRef = useRef<number | null>(null);
  // Counter, not a boolean: guards against a stray endTrustedHandoff (e.g. a
  // double-invoked finally) dropping suppression while another handoff is
  // still legitimately in flight.
  const suppressAutoLockRef = useRef(0);

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
      reason: SessionNotice["reason"],
      activeUserHint?: AuthUser,
    ) => {
      const result = await deactivateStoredAccount(accountId, activeUserHint);
      setAccounts(await getStoredAccounts());
      if (!result.wasActive || !result.disabledAccount)
        return "ignored" as const;

      if (result.activeUser) {
        activateAgentStore(result.activeUser);
        // Keep the refs in sync synchronously: a concurrent lock-screen verify
        // may resolve in the same tick and must observe the new user/status
        // (see verifyAgentOnLockScreen callers) rather than the pre-deactivation
        // React state.
        userRef.current = result.activeUser;
        const nextStatus = hasPinRef.current ? "locked" : "pinSetupRequired";
        authStatusRef.current = nextStatus;
        setUser(result.activeUser);
        setAuthStatus(nextStatus);
      } else {
        userRef.current = null;
        authStatusRef.current = "unauthenticated";
        setUser(null);
        setAuthStatus("unauthenticated");
      }
      setSessionNotice({
        expiredAgentName: result.disabledAccount.agentName,
        replacementAgentName: result.activeUser?.agentName ?? null,
        reason,
      });
      return result.activeUser ? ("fallback" as const) : ("signedOut" as const);
    },
    [],
  );

  const verifyAgentSession = useCallback(
    async (activeUser: AuthUser): Promise<"active" | "revoked"> => {
      const authStatus = await authenticateAgent(activeUser.phoneNumber);
      console.log("verifyAgentSession result:", authStatus);
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
        const outcome = await deactivateAccount(
          accountId,
          "revoked",
          updatedUser,
        );
        return outcome === "ignored" ? "active" : "revoked";
      }

      return "active";
    },
    [deactivateAccount],
  );

  const verifyAgentOnLockScreen = useCallback(
    async (activeUser: AuthUser) => {
      try {
        return await verifyAgentSession(activeUser);
      } catch {
        // The interceptor may have already ended this session (non-transient
        // refresh failure / repeat 401) as a side effect of this same call —
        // deactivateAccount would have already run and routed the UI away.
        // Don't contradict that with a "you can still unlock" toast.
        const sessionAlreadyEnded =
          !userRef.current ||
          getAgentAccountId(userRef.current) !== getAgentAccountId(activeUser);
        if (sessionAlreadyEnded) {
          return "revoked" as const;
        }
        showSnackbar(
          "Unable to verify agent status. You can still unlock with your PIN.",
          { type: "error" },
        );
        return "active" as const;
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
            .filter((account) => account.status === "available")
            .sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
          if (fallback)
            initialUser = await activateStoredAccount(fallback.accountId);
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
            if (status !== "revoked" && userRef.current) {
              setAuthStatus("locked");
            }
            return;
          }

          setAuthStatus("pinSetupRequired");
          return;
        }
        setAuthStatus("unauthenticated");
      } catch (error) {
        // A transient failure here (SecureStore/MMKV/Crypto hiccup) must NOT
        // destroy the stored session — deleting it would sign the agent out for a
        // recoverable glitch. Corrupt/invalid auth is already dropped defensively
        // by readActiveUser(); here we only surface the error and fall back to the
        // login gate, leaving stored credentials intact for the next launch.
        console.error("Failed to load authentication state:", error);
        showSnackbar("Could not restore your session. Please try again.");
        setUser(null);
        setAuthStatus("unauthenticated");
      }
    };

    loadAuthState();
  }, [verifyAgentOnLockScreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        nextState === "background" &&
        hasPinRef.current &&
        userRef.current &&
        (authStatusRef.current === "unlocked" ||
          authStatusRef.current === "locked")
      ) {
        // A trusted handoff (camera, photo library) is expected to background
        // the app for however long the agent takes — unlike the grace window
        // below, which only covers brief, unbounded-duration-free system
        // dialogs. Don't even arm the timestamp, so no later 'active' event
        // can treat this as a real absence.
        if (suppressAutoLockRef.current > 0) {
          return;
        }
        // Defer the decision to (re-)lock until we come back: record when we
        // left, whether we were unlocked or already on the lock screen. A
        // transient background (e.g. a Bluetooth/permission system dialog, a
        // notification pulldown) returns within AUTO_LOCK_GRACE_MS and must not
        // force a re-verification that could interrupt in-progress PIN entry.
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (nextState !== "active" || !hasPinRef.current || !userRef.current) {
        return;
      }

      if (suppressAutoLockRef.current > 0) {
        // Still inside (or just exited) a trusted handoff — nothing was
        // armed on the way out, but clear defensively in case of a race.
        backgroundedAtRef.current = null;
        return;
      }

      const backgroundedAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;

      const wasRealAbsence =
        backgroundedAt !== null &&
        Date.now() - backgroundedAt >= AUTO_LOCK_GRACE_MS;

      // A brief blip (whether we were unlocked or already locked) leaves
      // everything — including any digits already typed on the PIN screen —
      // exactly as it was.
      if (!wasRealAbsence) {
        return;
      }

      if (authStatusRef.current === "unlocked") {
        // A real absence while unlocked re-locks immediately. This only swaps
        // the protected route to the PIN screen (app/_layout.tsx's
        // Stack.Protected) — it must NOT go through `authStatus === 'loading'`,
        // which unmounts the entire app tree instead of just navigating within
        // it (see the `authStatus === 'loading'` render below).
        authStatusRef.current = "locked";
        setAuthStatus("locked");
      }
      // Otherwise we were already locked: re-verify below without touching
      // `authStatus`, so the mounted PIN screen is never unmounted/remounted.

      const activeUser = userRef.current;
      void verifyAgentOnLockScreen(activeUser).then((status) => {
        // Skip re-locking if verification deactivated the account (revoked or
        // admin-reset) and there is no longer an active user; deactivateAccount
        // has already routed to the correct screen. Also skip if the user
        // unlocked via the PIN screen while this background verify was still
        // in flight — re-locking would clobber a legitimate unlock.
        if (
          status !== "revoked" &&
          userRef.current &&
          authStatusRef.current !== "unlocked"
        ) {
          setAuthStatus("locked");
        }
      });
    });

    return () => subscription.remove();
  }, [verifyAgentOnLockScreen]);

  const login = useCallback(
    async (nextUser: AuthUser) => {
      const validatedUser = authUserSchema.parse(nextUser);

      const isFirstAccount = accounts.length === 0;
      await initPersistence();
      await saveAndActivateAccount(validatedUser);
      activateAgentStore(validatedUser, isFirstAccount);
      setAccounts(await getStoredAccounts());
      setUser(validatedUser);
      setAuthStatus(hasPin ? "unlocked" : "pinSetupRequired");
    },
    [accounts.length, hasPin],
  );

  const reauthenticateAccount = useCallback(
    async (accountId: string, nextUser: AuthUser) => {
      const validated = authUserSchema.parse(nextUser);
      if (getAgentAccountId(validated) !== accountId) {
        throw new Error("The credentials belong to a different agent account.");
      }
      await initPersistence();
      await saveAndActivateAccount(validated);
      activateAgentStore(validated);
      setAccounts(await getStoredAccounts());
      setUser(validated);
      setAuthStatus(hasPin ? "unlocked" : "pinSetupRequired");
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
    setAuthStatus("unlocked");
  }, []);

  const logout = useCallback(async () => {
    if (!user) return;
    await waitForOutboxIdle();
    stopOutboxSync();
    resetRefreshState();
    await deactivateAccount(getAgentAccountId(user), "manual", user);
  }, [deactivateAccount, user]);

  const setupPin = useCallback(async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error("PIN must contain exactly six digits.");
    }
    await storePin(pin);
    hasPinRef.current = true;
    setHasPin(true);
    setAuthStatus("unlocked");
  }, []);

  const unlockWithPin = useCallback(
    async (pin: string) => {
      if (!/^\d{6}$/.test(pin)) return false;
      await assertPinAvailable();
      const storedPin = await SecureStore.getItemAsync(PIN_SECURE_STORE_KEY);
      if (!(await storedPinMatches(storedPin, pin))) {
        await recordFailedPinAttempt();
        return false;
      }
      await clearPinAttempts();

      // The PIN was correct, but that only proves the device is trusted — it
      // says nothing about whether the agent's account is still valid server
      // side. Re-verify before granting access so a revoked agent or a
      // permanently-failed token refresh is caught right here instead of only
      // at boot/foreground.
      const activeUser = userRef.current;
      if (!activeUser) {
        throw new SessionEndedError();
      }
      const status = await verifyAgentOnLockScreen(activeUser);
      if (status === "revoked" || !userRef.current) {
        throw new SessionEndedError();
      }

      setAuthStatus("unlocked");
      return true;
    },
    [verifyAgentOnLockScreen],
  );

  useEffect(() => {
    setUnauthorizedHandler(async (accountId) => {
      await deactivateAccount(accountId, "expired");
    });
    setAuthUserUpdatedHandler((accountId, nextUser) => {
      setUser((current) =>
        current && getAgentAccountId(current) === accountId
          ? nextUser
          : current,
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

  const beginTrustedHandoff = useCallback(() => {
    suppressAutoLockRef.current += 1;
  }, []);

  const endTrustedHandoff = useCallback(() => {
    suppressAutoLockRef.current = Math.max(0, suppressAutoLockRef.current - 1);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accounts,
      sessionNotice,
      isAuthenticated: Boolean(user?.accessToken),
      isUnlocked: authStatus === "unlocked",
      isLoading: authStatus === "loading",
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
      beginTrustedHandoff,
      endTrustedHandoff,
    }),
    [
      accounts,
      authStatus,
      beginTrustedHandoff,
      endTrustedHandoff,
      getToken,
      getUser,
      login,
      logout,
      reauthenticateAccount,
      sessionNotice,
      setupPin,
      switchAccount,
      unlockWithPin,
      user,
    ],
  );

  // Only the initial boot-time load (loadAuthState above) sets 'loading'; the
  // AppState re-lock listener never does, specifically so returning from a
  // background/foreground transition re-verifies without unmounting the whole
  // app tree (and any mounted PIN entry) behind this spinner.
  if (authStatus === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator animating={true} color={theme.colors.primary} />
      </View>
    ); // Show loading
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
