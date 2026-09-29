import { z } from 'zod';

export const agentSchemeSchema = z
  .object({
    schemeId: z.string().min(1),
    schemeName: z.string().min(1),
  })
  .strict();

export type AgentScheme = z.infer<typeof agentSchemeSchema>;

const loginSchemeSchema = z
  .object({
    schemeID: z.string().min(1),
    schemeName: z.string().min(1),
  })
  .strict()
  .transform(({ schemeID, schemeName }) => ({
    schemeId: schemeID,
    schemeName,
  }));

export const authUserSchema = z
  .object({
    agentCode: z.number().int(),
    agentName: z.string().min(1),
    bankCode: z.string().min(1),
    bankName: z.string().min(4),
    phoneNumber: z.string().min(1),
    lastDepositDate: z.string().min(1).nullable(),
    limitAmount: z.number().nonnegative().nullable(),
    graceDays: z.number().int().nonnegative().nullable(),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).nullable(),
    bankType: z.string(),
    schemes: z.array(agentSchemeSchema),
  })
  .strict();

export type AuthUser = z.infer<typeof authUserSchema>;

export type AgentAccountStatus = 'available' | 'loginRequired';

export type AgentAccountProfile = Omit<
  AuthUser,
  'accessToken' | 'refreshToken'
>;

export interface AgentAccountSummary extends AgentAccountProfile {
  accountId: string;
  status: AgentAccountStatus;
  lastUsedAt: number;
}

export const tokenRefreshResponseSchema = z
  .object({
    refreshToken: z.string().min(1),
    accessToken: z.string().min(1),
  })
  .strict();

export type TokenRefreshResponse = z.infer<typeof tokenRefreshResponseSchema>;

export const authenticateMeResponseSchema = z
  .object({
    limitAmount: z.number().nonnegative(),
    isAgentRevoked: z.boolean(),
    lastDepositDate: z.string().min(1),
    graceDays: z.number().int().nonnegative(),
  })
  .strict();

export type AuthenticateMeResponse = z.infer<typeof authenticateMeResponseSchema>;

export const loginResponseSchema = z
  .object({
    agentName: z.string().min(1),
    agentCode: z.number().int(),
    bankCode: z.string().min(1),
    bankName: z.string().min(4),
    phoneNumber: z.string().min(1),
    lastDepositDate: z.string().min(1),
    limitAmount: z.number().nonnegative(),
    graceDays: z.number().int().nonnegative(),
    refreshToken: z.string().min(1),
    accessToken: z.string().min(1),
    bankType: z.string().min(1),
    schemes: z.array(loginSchemeSchema),
  })
  .strict();

export const legacyAuthUserSchema = z
  .object({
    agentCode: z.number().int(),
    agentName: z.string().min(1),
    bankCode: z.string().min(1),
    bankName: z.string().min(4),
    token: z.string().min(1),
    phoneNumber: z.string().min(1),
  })
  .strict()
  .transform(
    ({ token, ...user }): AuthUser => ({
      ...user,
      lastDepositDate: null,
      limitAmount: null,
      graceDays: null,
      accessToken: token,
      refreshToken: null,
      bankType: '',
      schemes: [],
    }),
  );
