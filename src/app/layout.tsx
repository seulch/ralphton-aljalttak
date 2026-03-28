import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AJT-gift — Cross-Border Gift Recommendations",
  description: "Discover country-exclusive gifts for US-Korea travelers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-primary text-fg-primary antialiased">
        {children}
      </body>
    </html>
  );
}
