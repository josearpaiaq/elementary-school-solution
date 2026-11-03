import type { Metadata } from "next";
import { t } from "@/lib/strings";
import "./globals.css";

export const metadata: Metadata = { title: t.appName };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
