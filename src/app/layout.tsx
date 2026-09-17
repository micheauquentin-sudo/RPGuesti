import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASTRA RP — Club ASTRA Orléans",
  description: "Système officiel de gestion des RP et entrées du Club ASTRA Orléans",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ASTRA RP",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#08090d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.className} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#08090d] text-gray-100">
        {children}
      </body>
    </html>
  );
}
