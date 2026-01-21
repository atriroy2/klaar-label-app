import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Replace this with your actual API key
  //  const testApiKey = "bk_16f1dd8c7ecc8b18455468d8c9a850237a975b1ddeb7ae6e";
   
   // Generate a unique timestamp for cache busting
   const timestamp = Date.now();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 
        Banner widget script for production
        */}
        { <Script
          // id="banner-widget"
          // src={`/banner-widget`}
          // data-api-key={testApiKey}
          // strategy="afterInteractive"
        /> }
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}