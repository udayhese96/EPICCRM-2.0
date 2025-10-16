import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Plus_Jakarta_Sans } from 'next/font/google'
// import { Analytics } from '@vercel/analytics/next' // Disabled for development
// Temporarily enable console for debugging
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'EPIC CRM 2.0',
  description: 'Customer Relationship Management System',
  generator: 'EPIC CRM 2.0',
}

// Load font at module scope as required by next/font
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['200','300','400','500','600','700','800'],
  display: 'swap',
  variable: '--font-plus-jakarta'
})

function DisableConsoleInProd() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Silence noisy browser logs in production
    console.log = () => {}
    console.info = () => {}
    console.debug = () => {}
    console.warn = () => {}
  }
  return null
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} style={{ fontFamily: 'var(--font-sans)' }}>
        {/* Disable console noise in production */}
        <DisableConsoleInProd />
        {children}
        {/* <Analytics /> */}
        {/* Global notifications */}
        <Toaster position="top-right" richColors duration={2000} closeButton />
      </body>
    </html>
  )
}
