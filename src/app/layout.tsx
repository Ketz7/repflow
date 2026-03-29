import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/navigation/BottomNav";
import OnboardingTour from "@/components/OnboardingTour";
import { WeightUnitProvider } from "@/context/WeightUnitContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RepFlow",
  description: "Get in the flow — workouts, programs, and progress",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RepFlow",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "RepFlow",
    description: "Get in the flow — workouts, programs, and progress",
    url: "https://repflow-one.vercel.app",
    siteName: "RepFlow",
    images: [
      {
        url: "https://repflow-one.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "RepFlow — fitness tracker PWA",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RepFlow",
    description: "Get in the flow — workouts, programs, and progress",
    images: ["https://repflow-one.vercel.app/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1120",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <WeightUnitProvider>
          <main className="flex-1 pb-20">{children}</main>
          <BottomNav />
          <OnboardingTour />
        </WeightUnitProvider>
      </body>
    </html>
  );
}
