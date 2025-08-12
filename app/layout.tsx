import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import PWAInstall from "@/components/PWAInstall"
import "./globals.css"

export const metadata: Metadata = {
  title: "Ryo Forge AI - Healthcare Assistant",
  description: "Your personalized healthcare AI assistant with Ayurvedic & Modern medical expertise. Chat with Dr. Jiva and Dr. Suri for personalized health guidance.",
  generator: 'v0.app',
  applicationName: 'Ryo Forge AI',
  referrer: 'origin-when-cross-origin',
  keywords: ['healthcare', 'AI', 'medical', 'ayurveda', 'health assistant', 'telemedicine'],
  authors: [{ name: 'Ryo Forge AI Team' }],
  creator: 'Ryo Forge AI',
  publisher: 'Ryo Forge AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://ryo-forge-ai.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Ryo Forge AI - Healthcare Assistant',
    description: 'Your personalized healthcare AI assistant with Ayurvedic & Modern medical expertise',
    url: 'https://ryo-forge-ai.vercel.app',
    siteName: 'Ryo Forge AI',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Ryo Forge AI Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ryo Forge AI - Healthcare Assistant',
    description: 'Your personalized healthcare AI assistant with Ayurvedic & Modern medical expertise',
    images: ['/icons/icon-512x512.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/icon.svg',
        color: '#667eea',
      },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ryo Forge AI',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <Suspense
          fallback={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          }
        >
          {children}
        </Suspense>
        <PWAInstall />
        <Analytics />
      </body>
    </html>
  )
}
