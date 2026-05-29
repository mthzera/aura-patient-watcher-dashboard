import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard AURA Patient Watcher",
  description:
    "Efetividade na gestão de casos clínicos — Do alerta ao desfecho assistencial",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.className} h-full dark`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
