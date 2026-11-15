import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Disclaimer } from "@/components/Disclaimer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "LookAhead",
  description: "A personalized month-end spending forecast with budget alerts.",
  icons: { icon: "/icon.svg" },
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
        <Header />
        <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-10 pt-6 sm:px-6 sm:pt-8">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}
