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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} style={{ fontFamily: '"Roboto", sans-serif' }}>
        {children}
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
