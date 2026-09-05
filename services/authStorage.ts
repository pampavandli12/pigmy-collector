import * as SecureStore from 'expo-secure-store';
import {
  AgentAccountProfile,
  AgentAccountStatus,
  AgentAccountSummary,
  AuthUser,
  authUserSchema,
  legacyAuthUserSchema,
  TokenRefreshResponse,
} from '@/types/auth';
import {
  AGENT_ACCOUNTS_SECURE_STORE_KEY,
  SECURE_STORE_KEY,
} from '@/utils/constants';

interface StoredAgentAccount {
  profile: AgentAccountProfile;
  accessToken: string | null;
  refreshToken: string | null;
  status: AgentAccountStatus;
  lastUsedAt: number;
}

export interface DeactivateAccountResult {
  disabledAccount: AgentAccountSummary | null;
  activeUser: AuthUser | null;
  wasActive: boolean;
}

export const getAgentAccountId = (
  user: Pick<AuthUser, 'agentCode' | 'bankCode'>,
) => `${user.bankCode}:${user.agentCode}`;

function toProfile(user: AuthUser): AgentAccountProfile {
  const { accessToken: _accessToken, refreshToken: _refreshToken, ...profile } =
    user;
  return profile;
}

function toSummary(
  accountId: string,
  account: StoredAgentAccount,
): AgentAccountSummary {
  return {
    ...account.profile,
    accountId,
    status: account.status,
    lastUsedAt: account.lastUsedAt,
  };
}

function toAuthUser(account: StoredAgentAccount): AuthUser | null {
  if (account.status !== 'available' || !account.accessToken) return null;
  const parsed = authUserSchema.safeParse({
    ...account.profile,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
  });
  return parsed.success ? parsed.data : null;
}

function parseStoredAccount(value: unknown): StoredAgentAccount | null {
  const legacy = authUserSchema.safeParse(value);
  if (legacy.success) {
    return {
      profile: toProfile(legacy.data),
      accessToken: legacy.data.accessToken,
      refreshToken: legacy.data.refreshToken,
      status: 'available',
      lastUsedAt: 0,
    };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<StoredAgentAccount>;
  const profileResult = authUserSchema.omit({
    accessToken: true,
    refreshToken: true,
  }).safeParse(candidate.profile);
  if (!profileResult.success) return null;
  if (candidate.status !== 'available' && candidate.status !== 'loginRequired') {
    return null;
  }

  return {
    profile: profileResult.data,
    accessToken:
      candidate.status === 'available' && typeof candidate.accessToken === 'string'
        ? candidate.accessToken
        : null,
    refreshToken:
      candidate.status === 'available' &&
      (typeof candidate.refreshToken === 'string' || candidate.refreshToken === null)
        ? candidate.refreshToken
        : null,
    status: candidate.status,
    lastUsedAt:
      typeof candidate.lastUsedAt === 'number' ? candidate.lastUsedAt : 0,
  };
}

async function readStoredAccounts(): Promise<Record<string, StoredAgentAccount>> {
  const stored = await SecureStore.getItemAsync(AGENT_ACCOUNTS_SECURE_STORE_KEY);
  if (!stored) return {};

  try {
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.entries(value).reduce<Record<string, StoredAgentAccount>>(
      (accounts, [accountId, item]) => {
        const parsed = parseStoredAccount(item);
        if (parsed) accounts[accountId] = parsed;
        return accounts;
      },
      {},
    );
  } catch {
    return {};
  }
}

async function writeStoredAccounts(accounts: Record<string, StoredAgentAccount>) {
  await SecureStore.setItemAsync(
    AGENT_ACCOUNTS_SECURE_STORE_KEY,
    JSON.stringify(accounts),
  );
}

export async function getStoredAccounts(): Promise<AgentAccountSummary[]> {
  const accounts = await readStoredAccounts();
  return Object.entries(accounts).map(([id, account]) =>
    toSummary(id, account),
  );
}

export async function getStoredAccountUser(
  accountId: string,
): Promise<AuthUser | null> {
  const account = (await readStoredAccounts())[accountId];
  return account ? toAuthUser(account) : null;
}

export async function saveAndActivateAccount(user: AuthUser): Promise<AuthUser> {
  const validated = authUserSchema.parse(user);
  const accounts = await readStoredAccounts();
  const accountId = getAgentAccountId(validated);
  const now = Date.now();
  accounts[accountId] = {
    profile: toProfile(validated),
    accessToken: validated.accessToken,
    refreshToken: validated.refreshToken,
    status: 'available',
    lastUsedAt: now,
  };
  await Promise.all([
    writeStoredAccounts(accounts),
    SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(validated)),
  ]);
  return validated;
}

export async function activateStoredAccount(accountId: string): Promise<AuthUser> {
  const accounts = await readStoredAccounts();
  const account = accounts[accountId];
  const user = account ? toAuthUser(account) : null;
  if (!user) throw new Error('This agent account requires login.');

  account.lastUsedAt = Date.now();
  await Promise.all([
    writeStoredAccounts(accounts),
    SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(user)),
  ]);
  return user;
}

export async function deactivateStoredAccount(
  accountId: string,
  activeUserHint?: AuthUser,
): Promise<DeactivateAccountResult> {
  const [accounts, storedCurrentUser] = await Promise.all([
    readStoredAccounts(),
    readActiveUser(),
  ]);
  const currentUser = storedCurrentUser ?? activeUserHint ?? null;
  let account = accounts[accountId];
  if (
    !account &&
    currentUser &&
    getAgentAccountId(currentUser) === accountId
  ) {
    account = {
      profile: toProfile(currentUser),
      accessToken: currentUser.accessToken,
      refreshToken: currentUser.refreshToken,
      status: 'available',
      lastUsedAt: Date.now(),
    };
    accounts[accountId] = account;
  }
  if (!account) {
    return { disabledAccount: null, activeUser: currentUser, wasActive: false };
  }

  account.status = 'loginRequired';
  account.accessToken = null;
  account.refreshToken = null;
  const wasActive = currentUser
    ? getAgentAccountId(currentUser) === accountId
    : false;

  if (!wasActive) {
    await writeStoredAccounts(accounts);
    return {
      disabledAccount: toSummary(accountId, account),
      activeUser: currentUser,
      wasActive: false,
    };
  }

  const fallbackEntry = Object.entries(accounts)
    .filter(([id, item]) => id !== accountId && toAuthUser(item))
    .sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt)[0];
  const fallbackUser = fallbackEntry ? toAuthUser(fallbackEntry[1]) : null;
  if (fallbackEntry && fallbackUser) {
    fallbackEntry[1].lastUsedAt = Date.now();
  }

  await writeStoredAccounts(accounts);
  if (fallbackUser) {
    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(fallbackUser));
  } else {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
  }

  return {
    disabledAccount: toSummary(accountId, account),
    activeUser: fallbackUser,
    wasActive: true,
  };
}

async function readActiveUser(): Promise<AuthUser | null> {
  const storedUser = await SecureStore.getItemAsync(SECURE_STORE_KEY);
  if (!storedUser) return null;
  try {
    const value: unknown = JSON.parse(storedUser);
    const current = authUserSchema.safeParse(value);
    if (current.success) return current.data;
    const legacy = legacyAuthUserSchema.safeParse(value);
    if (legacy.success) {
      await SecureStore.setItemAsync(
        SECURE_STORE_KEY,
        JSON.stringify(legacy.data),
      );
      return legacy.data;
    }
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    return null;
  } catch {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    return null;
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const user = await readActiveUser();
  if (!user) return null;
  const accounts = await readStoredAccounts();
  const id = getAgentAccountId(user);
  const existing = accounts[id];
  if (!existing || !toAuthUser(existing)) {
    accounts[id] = {
      profile: toProfile(user),
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      status: 'available',
      lastUsedAt: existing?.lastUsedAt || Date.now(),
    };
    await writeStoredAccounts(accounts);
  }
  return user;
}

export async function getStoredAuthContext() {
  const user = await getStoredUser();
  return user
    ? { token: user.accessToken, accountId: getAgentAccountId(user) }
    : null;
}

export async function getStoredToken() {
  return (await getStoredAuthContext())?.token ?? null;
}

export async function updateStoredTokensForAccount(
  accountId: string,
  tokens: TokenRefreshResponse,
): Promise<AuthUser> {
  const accounts = await readStoredAccounts();
  const account = accounts[accountId];
  const current = account ? toAuthUser(account) : null;
  if (!current) throw new Error('No authenticated agent account is stored.');

  const updated = authUserSchema.parse({ ...current, ...tokens });
  account.accessToken = updated.accessToken;
  account.refreshToken = updated.refreshToken;
  account.status = 'available';
  await writeStoredAccounts(accounts);

  const active = await readActiveUser();
  if (active && getAgentAccountId(active) === accountId) {
    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function updateStoredTokens(
  tokens: TokenRefreshResponse,
): Promise<AuthUser> {
  const user = await getStoredUser();
  if (!user) throw new Error('No authenticated user is stored.');
  const updated = authUserSchema.parse({ ...user, ...tokens });
  return saveAndActivateAccount(updated);
}

export async function updateStoredAgentProfile(
  accountId: string,
  profile: Pick<AuthUser, 'limitAmount' | 'lastDepositDate' | 'graceDays'>,
): Promise<AuthUser> {
  const accounts = await readStoredAccounts();
  let account = accounts[accountId];
  let current = account ? toAuthUser(account) : null;

  if (!current) {
    const active = await readActiveUser();
    if (active && getAgentAccountId(active) === accountId) {
      account = {
        profile: toProfile(active),
        accessToken: active.accessToken,
        refreshToken: active.refreshToken,
        status: 'available',
        lastUsedAt: Date.now(),
      };
      accounts[accountId] = account;
      current = active;
    }
  }

  if (!current || !account) {
    throw new Error('No authenticated agent account is stored.');
  }

  const updated = authUserSchema.parse({ ...current, ...profile });
  account.profile = toProfile(updated);
  await writeStoredAccounts(accounts);

  const active = await readActiveUser();
  if (active && getAgentAccountId(active) === accountId) {
    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function clearStoredAccounts() {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_STORE_KEY),
    SecureStore.deleteItemAsync(AGENT_ACCOUNTS_SECURE_STORE_KEY),
  ]);
}
