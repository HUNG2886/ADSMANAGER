import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const optionalText = (max: number) => z.union([z.string().trim().max(max), z.literal('')]).optional().transform(value => value || null);

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.union([z.string().trim().email().max(180), z.literal('')]).optional().transform(value => value?.toLowerCase() || null),
  rentalAccount: optionalText(300),
  notes: optionalText(2000),
});

export const noteSchema = z.object({ content: z.string().trim().min(1).max(2000) });

export const clientInclude = {
  accountAssignments: {
    orderBy: { createdAt: 'asc' },
    select: { customerAccount: { select: { id: true, name: true, customerId: true, status: true, mcc: { select: { id: true, name: true } } } } },
  },
} satisfies Prisma.ClientInclude;
