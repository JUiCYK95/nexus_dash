import { z } from 'zod'

// =============================================
// AUTHENTICATION SCHEMAS
// =============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  invitation_token: z.string().optional()
})

// =============================================
// TEAM MANAGEMENT SCHEMAS
// =============================================

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: 'Role must be owner, admin, or member' })
  }),
  permissions: z.array(z.string()).optional()
})

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  role: z.enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: 'Role must be owner, admin, or member' })
  }),
  permissions: z.array(z.string()).optional()
})

export const removeMemberSchema = z.object({
  memberId: z.string().uuid('Invalid member ID')
})

// =============================================
// MESSAGING SCHEMAS
// =============================================

export const sendMessageSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  message: z.string().min(1, 'Message cannot be empty').max(4096, 'Message too long')
})

export const sendBulkMessageSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'At least one contact required').max(100, 'Maximum 100 contacts per bulk send'),
  message: z.string().min(1, 'Message cannot be empty').max(4096, 'Message too long')
})

// =============================================
// ORGANIZATION SCHEMAS
// =============================================

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  settings: z.object({}).optional()
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  settings: z.object({}).optional()
})

// =============================================
// WHATSAPP CONFIGURATION SCHEMAS
// =============================================

export const whatsappConfigSchema = z.object({
  api_url: z.string().url('Invalid API URL'),
  api_key: z.string().min(10, 'API key must be at least 10 characters'),
  session_name: z.string().min(1, 'Session name is required').max(100)
})

export const updateWhatsappConfigSchema = z.object({
  api_url: z.string().url('Invalid API URL').optional(),
  api_key: z.string().min(10, 'API key must be at least 10 characters').optional(),
  session_name: z.string().min(1, 'Session name is required').max(100).optional()
})

// =============================================
// SUBSCRIPTION SCHEMAS
// =============================================

export const updateSubscriptionSchema = z.object({
  planId: z.enum(['starter', 'professional', 'business', 'enterprise'], {
    errorMap: () => ({ message: 'Invalid plan ID' })
  })
})

// =============================================
// SUPER ADMIN SCHEMAS
// =============================================

export const createSuperAdminSchema = z.object({
  userId: z.string().uuid('Invalid user ID')
})

export const updateUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  full_name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional()
})

export const updateOrganizationStatusSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  is_active: z.boolean()
})

// =============================================
// CONTACT MANAGEMENT SCHEMAS
// =============================================

export const createContactSchema = z.object({
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional()
})

export const updateContactSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID'),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional()
})

// =============================================
// PAGINATION SCHEMAS
// =============================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
})

// =============================================
// VALIDATION HELPER FUNCTIONS
// =============================================

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await schema.parseAsync(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`
      }
    }
    return { success: false, error: 'Invalid request body' }
  }
}

/**
 * Validate query parameters against schema
 */
export function validateQueryParams<T>(
  params: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(params)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`
      }
    }
    return { success: false, error: 'Invalid query parameters' }
  }
}
