import { z } from "zod";

export const ReportFeedItemSchema = z.object({
  reason: z.string().min(1).max(200),
  details: z.string().max(500).optional(),
});
