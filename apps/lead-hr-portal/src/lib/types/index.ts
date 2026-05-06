import { z } from "zod";

// ============================================================================
// Outlets
// ============================================================================

export const OutletSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  phone: z.string().nullable(),
  is_warehouse: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const OutletsResponseSchema = z.object({
  count: z.number(),
  outlets: z.array(OutletSchema),
});

export type Outlet = z.infer<typeof OutletSchema>;

// ============================================================================
// Roles
// ============================================================================

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum([
    "Facility",
    "Supermarket",
    "Bakery",
    "Restaurant",
    "Procurement",
    "Warehouse",
  ]),
  description: z.string().nullable(),
  responsibilities: z.array(z.tuple([z.string(), z.string()])).nullable(),
  requirements: z.array(z.string()).nullable(),
  is_active: z.boolean(),
});

export const RolesResponseSchema = z.object({
  count: z.number(),
  roles: z.array(RoleSchema),
});

export type Role = z.infer<typeof RoleSchema>;