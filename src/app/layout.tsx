import type { Metadata } from 'next'
import './globals.css'
import './safari-critical.css'
import AuthProvider from '@/components/auth-provider'
import AdminButton from '@/components/admin-button'

export const metadata: Metadata = {
  title: 'Loser Pool',
  description: 'NFL Loser Pool - Pick teams to lose!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <AdminButton />
        </AuthProvider>
      </body>
    </html>
  )
}
