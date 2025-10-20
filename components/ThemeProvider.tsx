'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply dark mode preference on initial load
    // Default to dark mode if no preference is saved
    const savedDarkMode = localStorage.getItem('darkMode')

    if (savedDarkMode === null) {
      // First time user - default to dark mode
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else if (savedDarkMode === 'true') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return <>{children}</>
}
