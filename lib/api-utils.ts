/**
 * Helper function to make API calls with the current organization ID header
 */
export function getOrgHeaders(): HeadersInit {
  if (typeof window === 'undefined') {
    return {}
  }

  const currentOrgId = localStorage.getItem('current_organization_id')
  console.log('🔑 Organization Header:', currentOrgId) // Debug log
  return currentOrgId ? {
    'x-organization-id': currentOrgId
  } : {}
}

/**
 * Fetch wrapper that automatically includes organization header
 */
export async function fetchWithOrg(url: string, options?: RequestInit): Promise<Response> {
  const orgHeaders = getOrgHeaders()

  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...orgHeaders, // Put orgHeaders last so it overrides any existing x-organization-id
    }
  })
}
