/**
 * Get CSRF token from cookies (client-side)
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') {
      return decodeURIComponent(value)
    }
  }

  return null
}

/**
 * Add CSRF token to fetch headers
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFToken()

  if (!token) {
    console.warn('CSRF token not found in cookies')
    return headers
  }

  const headersObj = new Headers(headers)
  headersObj.set('x-csrf-token', token)

  return headersObj
}

/**
 * Enhanced fetch with automatic CSRF token inclusion
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const enhancedOptions = {
    ...options,
    headers: addCSRFHeader(options.headers)
  }

  return fetch(url, enhancedOptions)
}
