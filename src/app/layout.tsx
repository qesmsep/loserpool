import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import AuthProvider from '@/components/auth-provider'

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
      <head>
        {/* Critical Safari-specific CSS to prevent purging */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @supports (-webkit-appearance: none) {
              .team-card, div.team-card, .safari-team-card, [class*="team-card"] {
                width: 90% !important;
                max-width: 90% !important;
                min-width: 90% !important;
                margin: 0 auto !important;
                display: block !important;
                -webkit-transform: translateZ(0) !important;
                transform: translateZ(0) !important;
                -webkit-backface-visibility: hidden !important;
                backface-visibility: hidden !important;
              }
              .flex, div.flex, [class*="flex"] {
                display: -webkit-flex !important;
                display: flex !important;
              }
              .grid, div.grid, [class*="grid"] {
                display: -webkit-grid !important;
                display: grid !important;
              }
            }
          `
        }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
