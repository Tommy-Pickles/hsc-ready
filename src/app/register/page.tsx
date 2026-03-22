'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = password.length === 0
    ? null
    : password.length < 6
      ? { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' }
      : password.length < 10
        ? { label: 'Fair', color: 'bg-orange-500', width: 'w-2/4' }
        : password.length < 14
          ? { label: 'Good', color: 'bg-blue-500', width: 'w-3/4' }
          : { label: 'Strong', color: 'bg-green-500', width: 'w-full' }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base">
              HR
            </div>
            <span className="font-bold text-slate-900 text-xl">HSC Ready</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 mt-1">Start practising for free today</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-2">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Smith"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {/* Password strength */}
              {passwordStrength && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${passwordStrength.color} ${passwordStrength.width}`} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{passwordStrength.label} password</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-600 mb-2">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-600 mt-1">Passwords don&apos;t match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold text-base hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
            Sign in →
          </Link>
        </p>

        <p className="text-center mt-4">
          <Link href="/" className="text-slate-400 hover:text-slate-500 text-sm transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
