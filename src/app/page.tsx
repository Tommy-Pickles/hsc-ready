'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const features = [
  {
    icon: '🎯',
    title: 'Smart Question Selection',
    description: 'Filter questions by module, mark value, and question type to build the perfect practice session.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Marking',
    description: 'Get instant, detailed marking for short answer and extended response questions using advanced AI.',
  },
  {
    icon: '📝',
    title: 'Detailed Feedback',
    description: 'Understand exactly where marks are awarded or lost with annotated model answers and tips.',
  },
  {
    icon: '📈',
    title: 'Track Your Progress',
    description: 'Monitor your performance across all HSC Biology modules and see your improvement over time.',
  },
]

const modules = [
  { name: 'Module 5', topic: 'Heredity', color: 'bg-blue-500' },
  { name: 'Module 6', topic: 'Genetic Change', color: 'bg-purple-500' },
  { name: 'Module 7', topic: 'Infectious Disease', color: 'bg-orange-500' },
  { name: 'Module 8', topic: 'Non-infectious Disease', color: 'bg-green-500' },
]

export default function HomePage() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              HR
            </div>
            <span className="font-bold text-slate-900 text-lg">HSC Ready</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100 text-sm font-medium"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div
            className={`transition-all duration-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              HSC Biology Years 11 &amp; 12
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                HSC Ready
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Master your HSC Biology exams with AI-powered practice and feedback.
              <span className="text-slate-600"> Stop guessing — start knowing.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-500/20"
              >
                Get Started — It&apos;s Free
                <span className="text-xl">→</span>
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-100 hover:-translate-y-0.5 transition-all"
              >
                Login
              </Link>
            </div>

            {/* Module pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              {modules.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${m.color}`} />
                  <span className="text-slate-500 font-medium">{m.name}:</span>
                  <span className="text-slate-800">{m.topic}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Everything you need to ace the HSC
            </h2>
            <p className="text-slate-500 text-lg">
              Built specifically for Year 12 Biology students
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-500/40 hover:bg-white/80 transition-all duration-300 hover:-translate-y-1 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 100 + 200}ms` }}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-slate-900 font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats banner */}
        <section className="bg-slate-50 border-y border-slate-200/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Practice Questions' },
              { value: '4', label: 'HSC Modules' },
              { value: 'AI', label: 'Instant Marking' },
              { value: '100%', label: 'Free to Use' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-slate-500 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Ready to start practising?
          </h2>
          <p className="text-slate-500 text-lg mb-8">
            Join HSC students already using HSC Ready to prepare smarter.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-500/20"
          >
            Create Free Account →
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} HSC Ready · Built for HSC Biology students</p>
      </footer>
    </div>
  )
}
