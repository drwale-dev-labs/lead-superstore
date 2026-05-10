import { z } from "zod";

// ============================================================================
// Public job postings
// ============================================================================

export const PublicJobSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  requirements: z.array(z.string()).nullable(),
  employment_type: z.string(),
  published_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  role_id: z.string().nullable(),
  outlets: z
    .object({ name: z.string(), city: z.string().nullable() })
    .nullable()
    .optional(),
  roles: z.object({ name: z.string(), unit: z.string() }).nullable().optional(),
});

export const PublicJobsResponseSchema = z.object({
  count: z.number(),
  jobs: z.array(PublicJobSchema),
});

export type PublicJob = z.infer<typeof PublicJobSchema>;