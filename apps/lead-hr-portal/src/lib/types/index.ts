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

// ============================================================================
// Jobs
// ============================================================================

export const JobStatusEnum = z.enum(["draft", "published", "closed"]);

export const JobPostingSchema = z.object({
  id: z.string().uuid(),
  role_id: z.string().nullable(),
  outlet_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  requirements: z.array(z.string()).nullable(),
  employment_type: z.string(),
  status: JobStatusEnum,
  published_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  created_at: z.string(),
  outlets: z.object({ name: z.string(), city: z.string().nullable() }).nullable().optional(),
  roles: z.object({ name: z.string(), unit: z.string() }).nullable().optional(),
});

export const JobPostingsResponseSchema = z.object({
  count: z.number(),
  jobs: z.array(JobPostingSchema),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;
export type JobStatus = z.infer<typeof JobStatusEnum>;

// ============================================================================
// Applications
// ============================================================================

export const ApplicationStatusEnum = z.enum([
  "new",
  "reviewing",
  "shortlisted",
  "interviewed",
  "rejected",
  "hired",
]);

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  job_posting_id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string(),
  resume_url: z.string().nullable(),
  cover_letter: z.string().nullable(),
  status: ApplicationStatusEnum,
  notes: z.string().nullable(),
  applied_at: z.string(),
  // Joined when listing
  job_postings: z
    .object({
      title: z.string(),
      outlet_id: z.string().uuid().nullable(),
      outlets: z.object({ name: z.string() }).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const ApplicationsResponseSchema = z.object({
  count: z.number(),
  applications: z.array(ApplicationSchema),
});

export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

// ============================================================================
// Payroll
// ============================================================================

export const PayrollStatusEnum = z.enum(["draft", "approved", "paid"]);

export const PayrollPeriodSchema = z.object({
  id: z.string().uuid(),
  outlet_id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
  status: PayrollStatusEnum,
  total_gross: z.number(),
  total_net: z.number(),
  approved_at: z.string().nullable(),
  approved_by: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  outlets: z.object({ name: z.string() }).nullable().optional(),
});

export const PayrollPeriodsResponseSchema = z.object({
  count: z.number(),
  periods: z.array(PayrollPeriodSchema),
});

export type PayrollPeriod = z.infer<typeof PayrollPeriodSchema>;
export type PayrollStatus = z.infer<typeof PayrollStatusEnum>;

export const PayrollEntrySchema = z.object({
  id: z.string().uuid(),
  period_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  gross_salary: z.number(),
  working_days: z.number(),
  deductions: z.number(),
  net_pay: z.number(),
  bank_name: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  bank_account_name: z.string().nullable(),
  payment_status: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
  staff: z
    .object({
      first_name: z.string(),
      last_name: z.string(),
      role_id: z.string().nullable(),
      roles: z.object({ name: z.string() }).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const PeriodDetailSchema = z.object({
  period: PayrollPeriodSchema,
  entries: z.array(PayrollEntrySchema),
});

export type PayrollEntry = z.infer<typeof PayrollEntrySchema>;
export type PeriodDetail = z.infer<typeof PeriodDetailSchema>;

export const EntryDeductionSchema = z.object({
  id: z.string().uuid(),
  entry_id: z.string().uuid(),
  source_type: z.enum(["loan", "advance", "fine"]),
  source_id: z.string().uuid(),
  amount: z.number(),
  description: z.string().nullable(),
});

export const EntryDeductionsResponseSchema = z.object({
  count: z.number(),
  items: z.array(EntryDeductionSchema),
});

export type EntryDeduction = z.infer<typeof EntryDeductionSchema>;

// ============================================================================
// Helpers
// ============================================================================

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}