import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/lib/contexts/CartContext';
import CartSidebar from '@/components/CartSidebar';
import CartButton from '@/components/CartButton';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tooth Pick - Sistema Dental",
  description: "Plataforma de gestión dental con múltiples roles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CartProvider>
          <Toaster position="top-right" />
          {children}
          <CartSidebar />
          <CartButton />
        </CartProvider>
      </body>
    </html>
  );
}
