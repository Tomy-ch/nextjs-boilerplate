import type { Metadata } from "next";

import { ToastProvider } from "@/components/shell/toaster/toaster";

import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

const SITE_NAME = "nextjs-boilerplate";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Next.js / React のプレゼンテーション層 boilerplate です。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
