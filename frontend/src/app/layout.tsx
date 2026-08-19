// Server Component — NO "use client" directive
// This file can safely export Metadata for proper SEO.
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClientLayout } from "@/components/ClientLayout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Strategic News Analyzer",
  description: "Geopolitical Intelligence Command Center — AI-powered analysis of global events, risk mapping, and predictive intelligence.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-[#020306] text-slate-100 flex h-screen overflow-hidden`}>
        {/*
          ClientLayout contains all client-side interactivity (sidebar, clock, navigation).
          The `children` prop is passed through as a Server Component subtree — this is
          the correct Next.js 13+ App Router pattern.
        */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
