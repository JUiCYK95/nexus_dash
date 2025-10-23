import { getCSRFToken } from './csrf-client'

/**
 * Helper function to make API calls with the current organization ID header
 */
export function getOrgHeaders(): HeadersInit {
  if (typeof window === 'undefined') {
    return {}
  }

  const currentOrgId = localStorage.getItem('current_organization_id')
  return currentOrgId ? {
    'x-organization-id': currentOrgId
  } : {}
}

/**
 * Get CSRF token header
 */
function getCSRFHeaders(): HeadersInit {
  if (typeof window === 'undefined') {
    return {}
  }

  const csrfToken = getCSRFToken()
  return csrfToken ? {
    'x-csrf-token': csrfToken
  } : {}
}

/**
 * Fetch wrapper that automatically includes organization header and CSRF token
 */
export async function fetchWithOrg(url: string, options?: RequestInit): Promise<Response> {
  const orgHeaders = getOrgHeaders()
  const csrfHeaders = getCSRFHeaders()

  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...orgHeaders,
      ...csrfHeaders, // Add CSRF token for POST/PUT/DELETE/PATCH
    }
  })
}
