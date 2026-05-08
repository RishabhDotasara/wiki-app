import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1 w-full">
              <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 md:py-10">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
