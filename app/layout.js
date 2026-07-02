import './globals.css'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata = {
  title: {
    default: 'OwnCampus — The Complete Education Operating System',
    template: '%s | OwnCampus',
  },
  description: 'Enterprise-grade Education Operating System for Schools, Colleges, Universities & Training Institutes',
  keywords: ['education', 'school management', 'college erp', 'lms', 'student information system'],
  authors: [{ name: 'OwnCampus' }],
  creator: 'OwnCampus',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'OwnCampus — The Complete Education Operating System',
    description: 'Enterprise-grade Education Operating System',
    siteName: 'OwnCampus',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFFFFF',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased mesh-bg">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-right"
          richColors
          expand
          toastOptions={{
            style: {
              background: '#FFFFFF',
              border: '1px solid #E8ECF0',
              color: '#0F172A',
            },
          }}
        />
        <SpeedInsights />
      </body>
    </html>
  )
}
