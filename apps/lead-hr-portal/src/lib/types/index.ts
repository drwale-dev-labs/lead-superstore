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

// ============================================================================
// Staff
// ============================================================================

export const StaffStatusEnum = z.enum([
  "onboarding",
  "pending_verification",
  "active",
  "inactive",
  "terminated",
]);

export const StaffSchema = z.object({
  id: z.string().uuid(),
  outlet_id: z.string().uuid().nullable(),
  role_id: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: StaffStatusEnum,
  hired_at: z.string().nullable(),
  terminated_at: z.string().nullable(),
  notes: z.string().nullable(),
  bank_name: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  bank_account_name: z.string().nullable(),
  photo_path: z.string().nullable().optional(),
  verified_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined data when ?expand=true
  outlets: z.object({ name: z.string() }).nullable().optional(),
  roles: z
    .object({ name: z.string(), unit: z.string() })
    .nullable()
    .optional(),
});

export const StaffListResponseSchema = z.object({
  count: z.number(),
  staff: z.array(StaffSchema),
});

export type Staff = z.infer<typeof StaffSchema>;
export type StaffStatus = z.infer<typeof StaffStatusEnum>;

// ============================================================================
// Verification
// ============================================================================

export const ReferenceTypeEnum = z.enum([
  "previous_employer",
  "community_leader",
  "religious_leader",
  "other",
]);

export const ReferenceSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  reference_type: ReferenceTypeEnum,
  full_name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  organization: z.string().nullable(),
  relationship: z.string(),
  note: z.string().nullable(),
  document_path: z.string().nullable(),
  document_filename: z.string().nullable(),
  collected_at: z.string(),
});

export const ReferencesResponseSchema = z.object({
  count: z.number(),
  references: z.array(ReferenceSchema),
});

export type Reference = z.infer<typeof ReferenceSchema>;
export type ReferenceType = z.infer<typeof ReferenceTypeEnum>;

export const GuarantorSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  address: z.string(),
  occupation: z.string(),
  relationship: z.string(),
  id_type: z.string().nullable(),
  id_number: z.string().nullable(),
  note: z.string().nullable(),
  document_path: z.string().nullable(),
  document_filename: z.string().nullable(),
  collected_at: z.string(),
});

export const GuarantorsResponseSchema = z.object({
  count: z.number(),
  guarantors: z.array(GuarantorSchema),
});

export type Guarantor = z.infer<typeof GuarantorSchema>;

export const VerificationStatusSchema = z.object({
  staff_id: z.string().uuid(),
  current_status: StaffStatusEnum,
  has_reference: z.boolean(),
  has_guarantor: z.boolean(),
  can_activate: z.boolean(),
  missing: z.array(z.string()),
});

export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

// ============================================================================
// Assignments / transfers
// ============================================================================

export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  outlet_id: z.string().uuid(),
  role_id: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  transfer_reason: z.string().nullable(),
  approved_by_name: z.string().nullable(),
  is_approved: z.boolean(),
  is_imported: z.boolean(),
  created_at: z.string(),
  outlets: z.object({ name: z.string() }).nullable().optional(),
  roles: z.object({ name: z.string(), unit: z.string() }).nullable().optional(),
});

export const AssignmentsResponseSchema = z.object({
  count: z.number(),
  assignments: z.array(AssignmentSchema),
});

export type Assignment = z.infer<typeof AssignmentSchema>;