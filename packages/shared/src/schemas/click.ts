import { z } from "zod";

export const ClickIncrementSchema = z.object({
  count: z.number().int().min(1).max(1000),
});

export const ClickCountsSchema = z.object({
  global: z.number().int().nonnegative(),
  user: z.number().int().nonnegative().nullable(),
});

export type ClickIncrementInput = z.infer<typeof ClickIncrementSchema>;
export type ClickCounts = z.infer<typeof ClickCountsSchema>;
