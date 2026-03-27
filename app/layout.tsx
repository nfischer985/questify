import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Questify',
  description: 'Complete real-world side quests, level up, and compete globally.',
  icons: {
    icon:     '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export const viewport: Viewport = {
  width:           'device-width',
  initialScale:    1,
  maximumScale:    1,
  themeColor:      '#10b981',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
