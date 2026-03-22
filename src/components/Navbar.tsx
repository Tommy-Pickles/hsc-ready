'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
}

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pathname])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    setUser(null)
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/quiz/configure', label: 'Practice' },
    { href: '/history', label: 'History' },
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
              HR
            </div>
            <span className="font-bold text-slate-900 text-lg hidden sm:block">HSC Ready</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {!loading && user ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </>
            ) : null}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-24 h-8 bg-slate-100 rounded-lg animate-pulse" />
            ) : user ? (
              <>
                {/* User badge */}
                <div className="hidden sm:flex items-center gap-2.5 bg-slate-100 border border-slate-200 rounded-full pl-3 pr-1 py-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-700 text-sm font-medium max-w-[120px] truncate">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-slate-200 ml-1"
                    title="Log out"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {menuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-blue-500/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && user && (
          <div className="md:hidden border-t border-slate-200 py-3 space-y-1 animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-slate-700 text-sm font-medium">{user.name}</span>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-slate-100 transition-colors"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
