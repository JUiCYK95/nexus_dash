/**
 * Feature Flags System
 * Allows gradual rollout of new features without breaking production
 */

export interface FeatureFlags {
  // Security features
  enableCsrfProtection: boolean
  enableAdvancedRateLimiting: boolean

  // New features
  enablePendingInvitations: boolean
  enableAdvancedAnalytics: boolean

  // Experimental features
  enableBetaFeatures: boolean
}

/**
 * Get feature flags based on environment
 */
export function getFeatureFlags(): FeatureFlags {
  const env = process.env.NODE_ENV
  const isProduction = env === 'production'

  return {
    // Security: Only enable in production after thorough testing
    enableCsrfProtection: false, // TODO: Enable after implementing proper CSRF token handling in frontend
    enableAdvancedRateLimiting: true,

    // New features: Enable gradually
    enablePendingInvitations: true, // Already tested and deployed
    enableAdvancedAnalytics: false, // Not yet implemented

    // Experimental: Only in development
    enableBetaFeatures: !isProduction,
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags()
  return flags[feature]
}

/**
 * Feature flag for specific users/organizations (canary releases)
 */
export function isFeatureEnabledForOrg(
  feature: keyof FeatureFlags,
  organizationId?: string
): boolean {
  // First check global feature flag
  if (!isFeatureEnabled(feature)) {
    return false
  }

  // TODO: Implement organization-specific feature flags from database
  // This allows testing new features with specific beta organizations

  return true
}
