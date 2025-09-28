import { ErrorBoundary } from '@/components/error-boundary'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Clinic Receptionist',
  description: 'Professional clinic appointment and patient queue management system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
