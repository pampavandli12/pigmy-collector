import { z } from 'zod';

export const authUserSchema = z
  .object({
    agentCode: z.number().int(),
    agentName: z.string().min(1),
    bankCode: z.string().min(1),
    token: z.string().min(1),
  })
  .strict();

export type AuthUser = z.infer<typeof authUserSchema>;
