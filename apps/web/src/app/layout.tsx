import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MMRTEC Monitoramento",
  description: "Sistema de monitoramento de unidades prisionais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${plusJakarta.variable} ${geistMono.variable} h-full dark`}
    >
      <body
        className={`${plusJakarta.className} ${geistMono.variable} h-full antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
