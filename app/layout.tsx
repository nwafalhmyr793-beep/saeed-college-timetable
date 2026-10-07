import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "جدول كلية السعيد",
  description: "البحث في الجدول الدراسي حسب القاعة والمقرر والمدرس والقسم والمستوى واليوم.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
