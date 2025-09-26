import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { headers } from 'next/headers'
import ContextProvider from '@/context'

export const metadata: Metadata = {
  title: "Caesar - Batch Payments Made Simple",
  description: "Send crypto payments to multiple recipients at once with Caesar",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersObj = await headers()
  const cookies = headersObj.get('cookie')

  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ContextProvider cookies={cookies}>
          <Suspense>
            {children}
            <Analytics />
          </Suspense>
        </ContextProvider>
      </body>
    </html>
  )
}
