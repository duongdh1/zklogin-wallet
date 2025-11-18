import type { Metadata } from "next"
import localFont from "next/font/local"
import Script from "next/script"
import { AuthProvider } from "@/contexts/auth-context"
import { DevnetBanner } from "@/components/atoms/devnet-banner"
import { Toaster } from '@repo/ui/sonner'
import "./globals.css"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Sui Wallet - zkLogin",
  description: "A Sui wallet using zkLogin for secure, private authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="oauth-hash-capture" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined' && window.location.hash) {
              console.log('💾 Saving hash to sessionStorage:', window.location.hash);
              sessionStorage.setItem('oauth_callback_hash', window.location.hash);
            }
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <DevnetBanner />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
