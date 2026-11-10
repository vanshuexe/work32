import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stressout Tours And Travel — Experience the Magic of Kashmir",
  description: "Plan a comfortable, memorable Kashmir holiday with Stressout Tours And Travel. Explore personalized tour packages, stays and experiences."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
