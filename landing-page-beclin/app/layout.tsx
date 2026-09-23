import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Nunito, Nunito_Sans } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-nunito',
})

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito-sans',
})

export const metadata: Metadata = {
  title: 'beclin | Expertos lavando — Lavandería en Ciudad Victoria',
  description:
    'beclin es tu lavandería experta en Ciudad Victoria, Tamaulipas. Lavado y secado, planchado, tintorería, edredones, tenis, tapetes y más. Plaza Sierra Madre. Llámanos al 834 141 1298.',
  generator: 'v0.app',
  keywords: [
    'lavandería Ciudad Victoria',
    'beclin',
    'lavado y planchado',
    'tintorería Ciudad Victoria',
    'lavado de edredones',
  ],
  openGraph: {
    title: 'beclin | Expertos lavando',
    description:
      'Lavandería experta en Ciudad Victoria. Lavado, planchado, tintorería y más en Plaza Sierra Madre.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1d3fb8',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`light ${nunito.variable} ${nunitoSans.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
