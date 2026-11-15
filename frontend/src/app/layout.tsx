import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "LookAhead Market Pulse — News vs. Market Direction",
  description: "A transparent market-news study comparing public headlines with historical market direction.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f5f2eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col">
        <main className="flex-1">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}
