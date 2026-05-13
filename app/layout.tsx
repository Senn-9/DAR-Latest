import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Sora } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DAR Procurement",
  description: "DAR Procurement Monitoring and Automation System",
  icons: {
    icon: '/ncf/ccs%20logo.png',
    shortcut: '/ncf/ccs%20logo.png',
    apple: '/ncf/ncf%20logo.jpg',
  },
  creator: "NCF College of Computer Studies",
  authors: [
    {
      name: "KHANA CORALDE",
    },
    {
      name: "PAMELA MAE CADO",
    },
    {
      name: "FRANC JENTZEN TOTAÑES",
    },
    {
      name: "JAYVEE KENN VILLOTE",
    },
    {
      name: "JETHAN BENEDICT BARCENAS",
    },
    {
      name: "JOHN CHRISTIAN BENAVIDEZ",
    },
  ],
  openGraph: {
    title: "DAR Procurement",
    description: "DAR Procurement System",
    type: "website",
    images: [
      {
        url: '/ncf/ccs%20logo.png',
        alt: 'College of Computer Studies',
      },
      {
        url: '/ncf/ncf%20logo.jpg',
        alt: 'Naga College Foundation, Inc.',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
