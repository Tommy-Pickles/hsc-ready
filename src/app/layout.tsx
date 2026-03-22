import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HSC Ready — Ace Your HSC Biology Exams',
  description: 'Master your HSC Biology exams with AI-powered practice questions and personalised feedback. hscready.com',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  )
}
