import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin - NimiqNFT",
  description: "Administration panel for NimiqNFT",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
