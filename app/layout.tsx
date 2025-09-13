import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
// import { Analytics } from '@vercel/analytics/next' // Disabled for development
// Temporarily enable console for debugging
import './globals.css'

export const metadata: Metadata = {
  title: 'EPIC CRM 2.0',
  description: 'Customer Relationship Management System',
  generator: 'EPIC CRM 2.0',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
