import { z } from "zod";

export const cardSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required").max(50),
  affiliateUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  resetType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "ROLLING", "FIXED"]),
  duration: z
    .number({ invalid_type_error: "Duration must be a number" })
    .int()
    .min(60, "Minimum duration is 60 seconds")
    .max(86400, "Maximum duration is 24 hours"),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});

export const cardUpdateSchema = cardSchema.partial();

// Use z.output to get the resolved (non-optional) type
export type CardInput = z.output<typeof cardSchema>;
export type CardUpdateInput = z.output<typeof cardUpdateSchema>;
