import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/lib/contexts/CartContext';
import CartSidebar from '@/components/CartSidebar';
import CartButton from '@/components/CartButton';



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
      <body className="antialiased"
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
