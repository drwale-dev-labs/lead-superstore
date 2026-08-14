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
  cv_path: z.string().nullable().optional(),
  cv_filename: z.string().nullable().optional(),
  cover_letter_path: z.string().nullable().optional(),
  cover_letter_filename: z.string().nullable().optional(),
  certificate_path: z.string().nullable().optional(),
  certificate_filename: z.string().nullable().optional(),
  nysc_certificate_path: z.string().nullable().optional(),
  nysc_certificate_filename: z.string().nullable().optional(),
  status: ApplicationStatusEnum,
  notes: z.string().nullable(),
  interview_scheduled_at: z.string().nullable().optional(),
  interview_location: z.string().nullable().optional(),
  resume_date: z.string().nullable().optional(),
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

export const InterviewScoreSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  communication_score: z.number().min(1).max(5),
  role_knowledge_score: z.number().min(1).max(5),
  reliability_score: z.number().min(1).max(5),
  culture_fit_score: z.number().min(1).max(5),
  overall_comment: z.string().nullable(),
  scored_at: z.string(),
});

export type InterviewScore = z.infer<typeof InterviewScoreSchema>;

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
  catch_up_pay: z.number().nullable().optional(),
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
    bank_sort_code: z.string().nullable().optional(),
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
  source_type: z.enum(["loan", "advance", "fine", "training_bond"]),
  source_id: z.string().uuid(),
  amount: z.number(),
  description: z.string().nullable(),
});

export const EntryDeductionsResponseSchema = z.object({
  count: z.number(),
  items: z.array(EntryDeductionSchema),
});

export type EntryDeduction = z.infer<typeof EntryDeductionSchema>;

export const BondItemSchema = z.object({
  id: z.string().uuid(),
  entry_id: z.string().uuid(),
  bond_id: z.string().uuid(),
  direction: z.enum(["deduct", "payback"]),
  amount: z.number(),
  month_number: z.number(),
});

export const BondItemsResponseSchema = z.object({
  count: z.number(),
  items: z.array(BondItemSchema),
});

export type BondItem = z.infer<typeof BondItemSchema>;

export const BackdatedCandidateSchema = z.object({
  staff_id: z.string().uuid(),
  staff_name: z.string(),
  entry_id: z.string().uuid(),
  missed_period_id: z.string().uuid(),
  missed_period_label: z.string(),
  days_owed: z.number(),
  estimated_amount: z.number(),
});

export type BackdatedCandidate = z.infer<typeof BackdatedCandidateSchema>;

export const CatchUpItemSchema = z.object({
  id: z.string().uuid(),
  entry_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  missed_period_id: z.string().uuid(),
  days_owed: z.number(),
  amount: z.number(),
  description: z.string().nullable(),
});

export const CatchUpItemsResponseSchema = z.object({
  count: z.number(),
  items: z.array(CatchUpItemSchema),
});

export type CatchUpItem = z.infer<typeof CatchUpItemSchema>;

// ============================================================================
// Helpers
// ============================================================================

export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
};

// ============================================================================
// Deductions: loans, advances, fines
// ============================================================================

const StaffMiniSchema = z
  .object({
    first_name: z.string(),
    last_name: z.string(),
  })
  .nullable()
  .optional();

export const LoanSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  principal: z.number(),
  balance: z.number(),
  monthly_installment: z.number(),
  status: z.enum(["active", "paid_off", "cancelled"]),
  notes: z.string().nullable(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
  staff: StaffMiniSchema,
});

export const LoansResponseSchema = z.object({
  count: z.number(),
  loans: z.array(LoanSchema),
});

export type Loan = z.infer<typeof LoanSchema>;

export const AdvanceSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  amount: z.number(),
  reason: z.string().nullable(),
  status: z.enum(["pending", "applied", "cancelled"]),
  approved_at: z.string().nullable(),
  applied_to_period_id: z.string().uuid().nullable(),
  created_at: z.string(),
  staff: StaffMiniSchema,
});

export const AdvancesResponseSchema = z.object({
  count: z.number(),
  advances: z.array(AdvanceSchema),
});

export type Advance = z.infer<typeof AdvanceSchema>;

export const FineSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  amount: z.number(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "applied", "cancelled"]),
  approved_at: z.string().nullable(),
  applied_to_period_id: z.string().uuid().nullable(),
  created_at: z.string(),
  staff: StaffMiniSchema,
});

export const FinesResponseSchema = z.object({
  count: z.number(),
  fines: z.array(FineSchema),
});

export type Fine = z.infer<typeof FineSchema>;

// ============================================================================
// Salary structures
// ============================================================================

export const SalaryStructureSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  gross_salary: z.number(),
  effective_from: z.string(),
  effective_to: z.string().nullable(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  staff: z
    .object({
      first_name: z.string(),
      last_name: z.string(),
    })
    .nullable()
    .optional(),
});

export const SalaryStructuresResponseSchema = z.object({
  count: z.number(),
  salary_structures: z.array(SalaryStructureSchema),
});

export type SalaryStructure = z.infer<typeof SalaryStructureSchema>;

// ============================================================================
// Orders (e-commerce)
// ============================================================================

export const OrderStatusEnum = z.enum([
  "pending_payment",
  "payment_received",
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
  "refunded",
]);

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string(),
  unit_price: z.number(),
  quantity: z.number(),
  line_total: z.number(),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  fulfillment_outlet_id: z.string().uuid(),
  fulfillment_method: z.enum(["pickup", "delivery"]),
  delivery_address: z.string().nullable(),
  delivery_city: z.string().nullable(),
  delivery_notes: z.string().nullable(),
  subtotal: z.number(),
  delivery_fee: z.number(),
  service_charge: z.number(),
  total: z.number(),
  status: OrderStatusEnum,
  payment_reference: z.string().nullable(),
  paid_at: z.string().nullable(),
  staff_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  outlets: z
    .object({
      name: z.string(),
      city: z.string().nullable(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  customers: z
    .object({
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      phone: z.string(),
    })
    .nullable()
    .optional(),
});

export const OrdersResponseSchema = z.object({
  count: z.number(),
  orders: z.array(OrderSchema),
});

export const OrderDetailSchema = z.object({
  order: OrderSchema,
  items: z.array(OrderItemSchema),
});

export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderDetail = z.infer<typeof OrderDetailSchema>;

// ============================================================================
// Products & stock (e-commerce)
// ============================================================================

export const AdminProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  category_id: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  is_restaurant_item: z.boolean(),
  image_url: z.string().nullable(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  product_categories: z
    .object({ name: z.string(), unit: z.enum(["Supermarket", "Bakery", "Restaurant"]) })
    .nullable()
    .optional(),
});

export const AdminProductsResponseSchema = z.object({
  count: z.number(),
  products: z.array(AdminProductSchema),
});

export type AdminProduct = z.infer<typeof AdminProductSchema>;

export const StockRowSchema = z.object({
  outlet_id: z.string().uuid(),
  quantity: z.number(),
  updated_at: z.string().optional(),
  outlets: z
    .object({ name: z.string(), city: z.string().nullable(), is_warehouse: z.boolean() })
    .nullable()
    .optional(),
});

export const AdminProductStockSchema = z.object({
  product_id: z.string().uuid(),
  is_restaurant_item: z.boolean(),
  stock: z.array(StockRowSchema),
});

export type StockRow = z.infer<typeof StockRowSchema>;
export type AdminProductStock = z.infer<typeof AdminProductStockSchema>;

// ============================================================================
// Categories (e-commerce)
// ============================================================================

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum(["Supermarket", "Bakery", "Restaurant"]),
  description: z.string().nullable(),
  display_order: z.number(),
  is_active: z.boolean(),
});

export const CategoriesResponseSchema = z.object({
  count: z.number(),
  categories: z.array(CategorySchema),
});

export type Category = z.infer<typeof CategorySchema>;
export type Unit = "Supermarket" | "Bakery" | "Restaurant";

// ============================================================================
// Staff contracts
// ============================================================================

export const ContractStatusEnum = z.enum(["draft", "sent", "signed"]);

export const ContractSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  content_html: z.string(),
  status: ContractStatusEnum,
  generated_by: z.string().nullable().optional(),
  generated_at: z.string(),
  sent_at: z.string().nullable().optional(),
  pdf_path: z.string().nullable().optional(),
  signed_copy_path: z.string().nullable().optional(),
  signed_uploaded_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ContractsResponseSchema = z.object({
  count: z.number(),
  contracts: z.array(ContractSchema),
});

export type Contract = z.infer<typeof ContractSchema>;
export type ContractStatus = z.infer<typeof ContractStatusEnum>;