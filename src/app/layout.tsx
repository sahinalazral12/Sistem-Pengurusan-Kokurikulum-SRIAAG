import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SPK - Sistem Pengurusan Kokurikulum | SR Islam Al Amin Gombak",
  description: "Sistem Pengurusan Kokurikulum untuk Sekolah Rendah Islam Al Amin, Gombak. Modul Laporan Guru dan Kehadiran Murid Tahap 2 (Tahun 4-6).",
  keywords: ["kokurikulum", "Al Amin", "Gombak", "kehadiran murid", "laporan aktiviti"],
  authors: [{ name: "Sekolah Rendah Islam Al Amin Gombak" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
