import { apiClient } from "./client";
import { z } from "zod";

const OutletSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp_number: z.string().nullable(),
  is_warehouse: z.boolean(),
  is_active: z.boolean(),
});

const OutletsResponseSchema = z.object({
  count: z.number(),
  outlets: z.array(OutletSchema),
});

export type Outlet = z.infer<typeof OutletSchema>;

export async function fetchShoppingOutlets(): Promise<Outlet[]> {
  const { data } = await apiClient.get("/api/outlets/");
  return OutletsResponseSchema.parse(data).outlets.filter(
    (o) => o.is_active && !o.is_warehouse,
  );
}