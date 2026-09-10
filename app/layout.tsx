import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sahaja Yoga Newsletter Studio",
  description: "A private, interactive demo for creating Sahaja Yoga newsletters, events, and community invitations.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
