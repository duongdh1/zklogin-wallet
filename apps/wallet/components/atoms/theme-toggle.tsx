'use client'

import { useState, useEffect } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.className = savedTheme
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.className = newTheme
    localStorage.setItem('theme', newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
    >
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}