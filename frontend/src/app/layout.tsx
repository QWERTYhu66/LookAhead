import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "LookAhead",
  description: "A personalized month-end spending forecast with budget alerts.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <header className="material sticky top-0 z-10">
          <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-title">
              LookAhead
            </Link>
            <div className="flex gap-5 text-body">
              <Link href="/" className="hover:text-accent">
                Forecast
              </Link>
              <Link href="/evaluation" className="hover:text-accent">
                How good is it?
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}
