'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      console.log('Testing authentication...')

      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      console.log('User result:', { user, error: userError })

      if (userError) {
        setError(userError)
      } else {
        setUser(user)
      }

      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      console.log('Session result:', { session, error: sessionError })

    } catch (err) {
      console.error('Error:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Testing Authentication...</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4">
        <h2 className="text-xl font-semibold mb-2">User Status</h2>
        {user ? (
          <div className="text-green-600">
            <p>✅ Authenticated</p>
            <pre className="mt-2 bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="text-red-600">
            <p>❌ Not authenticated</p>
            {error && (
              <pre className="mt-2 bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Next Steps:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Wenn ❌: Bitte <a href="/login" className="text-blue-600 hover:underline">einloggen</a></li>
          <li>Wenn ✅: Session ist aktiv, Super-Admin sollte funktionieren</li>
          <li>Überprüfen Sie die Browser-Konsole für detaillierte Logs</li>
        </ul>
      </div>
    </div>
  )
}
