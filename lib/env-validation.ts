import { z } from 'zod'

/**
 * Environment Variable Validation Schema
 * Validates all required environment variables at runtime
 */
const envSchema = z.object({
  // Next.js
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Stripe (Optional - only required if billing is enabled)
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // WhatsApp API (Required)
  WAHA_BASE_URL: z.string().url('WAHA_BASE_URL must be a valid URL').optional(),
  WAHA_API_KEY: z.string().optional(),
  NEXT_PUBLIC_WHATSAPP_SESSION_NAME: z.string().default('default'),

  // Email Configuration (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),

  // Security (Required)
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters').optional(),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be exactly 32 characters').max(32).optional(),

  // Feature Flags (Optional)
  NEXT_PUBLIC_ENABLE_BILLING: z.string().optional(),
  NEXT_PUBLIC_ENABLE_TEAM_FEATURES: z.string().optional(),
  NEXT_PUBLIC_ENABLE_API_ACCESS: z.string().optional(),
  NEXT_PUBLIC_ENABLE_WEBHOOKS: z.string().optional(),

  // Analytics (Optional)
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),

  // Development (Optional)
  NEXT_PUBLIC_DEBUG: z.string().optional()
})

/**
 * Validate environment variables at runtime
 * Throws an error if validation fails
 */
export function validateEnvironmentVariables() {
  try {
    const env = envSchema.parse(process.env)

    // Additional custom validations
    if (env.NEXT_PUBLIC_ENABLE_BILLING === 'true') {
      if (!env.STRIPE_SECRET_KEY || !env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error('Stripe keys are required when billing is enabled')
      }
    }

    if (env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters')
    }

    console.log('✅ Environment variables validated successfully')
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      throw new Error('Invalid environment variables. Please check your .env file.')
    }
    throw error
  }
}

/**
 * Get validated environment variables
 * Returns undefined for optional variables that are not set
 */
export function getEnvVar(key: keyof z.infer<typeof envSchema>): string | undefined {
  return process.env[key]
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(feature: 'billing' | 'team' | 'api' | 'webhooks'): boolean {
  const featureMap = {
    billing: 'NEXT_PUBLIC_ENABLE_BILLING',
    team: 'NEXT_PUBLIC_ENABLE_TEAM_FEATURES',
    api: 'NEXT_PUBLIC_ENABLE_API_ACCESS',
    webhooks: 'NEXT_PUBLIC_ENABLE_WEBHOOKS'
  }

  const envKey = featureMap[feature]
  return process.env[envKey] === 'true'
}

/**
 * Validate environment variables on module load (only in Node.js environment)
 */
if (typeof window === 'undefined') {
  try {
    validateEnvironmentVariables()
  } catch (error) {
    // Log error but don't crash the app in development
    if (process.env.NODE_ENV === 'production') {
      throw error
    } else {
      console.warn('⚠️  Environment validation warning:', error)
    }
  }
}

// Export type for typed environment access
export type ValidatedEnv = z.infer<typeof envSchema>
