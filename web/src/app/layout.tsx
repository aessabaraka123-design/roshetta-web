import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";
import MainLayoutWrapper from "@/components/MainLayoutWrapper";
import SocketProvider from "@/components/SocketProvider";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-sans",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "روشتة — تطبيق إدارة الصيدليات",
  description: "نظام إدارة صيدليات متكامل (Multi-Branch)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${ibmPlexSansArabic.variable} ${ibmPlexMono.variable} h-full antialiased font-sans`}
    >
      <body
        className="min-h-full bg-bg text-ink selection:bg-primary-pale flex"
        suppressHydrationWarning
      >
        <SocketProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              className:
                "font-sans font-bold text-[22px] px-8 py-5 shadow-2xl rounded-2xl border-2 border-teal",
              style: {
                background: "#0F3D2E",
                color: "#fff",
                minWidth: "400px",
                textAlign: "center",
                marginTop: "20px",
              },
              success: {
                iconTheme: { primary: "#34d399", secondary: "#0F3D2E" },
              },
            }}
          />
          <Sidebar />
          <div className="flex-1 min-h-screen relative flex flex-col">
            <MainLayoutWrapper>{children}</MainLayoutWrapper>
          </div>
        </SocketProvider>
      </body>
    </html>
  );
}
