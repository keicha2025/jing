import type { Metadata, Viewport } from 'next'
import './globals.css'
import { TimerProvider } from "@/context/TimerContext";
import { ToastProvider } from "@/context/ToastContext";
import BottomNav from "@/components/BottomNav";
import GlobalTimerBar from "@/components/GlobalTimerBar";
import PageTransition from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "案時記 / caselog",
  description: "Freelance Case & Time Management",
  manifest: "/caselog/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "案時記",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#8BA888",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link rel="icon" href="/caselog/favicon.png" />
        <link rel="apple-touch-icon" href="/caselog/app-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased font-sans overscroll-none h-full bg-[#F9F8F6]">
        <TimerProvider>
          <ToastProvider>
            <div className="flex flex-col min-h-screen">
              <main className="flex-1 pb-32">
                <PageTransition>
                  {children}
                </PageTransition>
              </main>
            </div>
            <BottomNav />
          </ToastProvider>
        </TimerProvider>
      </body>
    </html>
  );
}
