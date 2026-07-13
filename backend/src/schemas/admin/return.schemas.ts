import { z } from 'zod';

export const returnStatusSchema = z.object({
  status: z.enum(['requested', 'approved', 'rejected', 'refunded']),
  refundAmount: z.coerce.number().nonnegative().optional().nullable(),
  note: z.string().optional().or(z.literal('')),
});

export type ReturnStatusInput = z.infer<typeof returnStatusSchema>;
