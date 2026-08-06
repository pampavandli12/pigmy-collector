import { z } from 'zod';

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
  })
  .strict();

export type AuthUser = z.infer<typeof authUserSchema>;

export const tokenRefreshResponseSchema = z
  .object({
    refreshToken: z.string().min(1),
    accessToken: z.string().min(1),
  })
  .strict();

export type TokenRefreshResponse = z.infer<typeof tokenRefreshResponseSchema>;

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
    }),
  );
