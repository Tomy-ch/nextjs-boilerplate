import type { Metadata } from "next";
import { Suspense } from "react";

import { ToastProvider } from "@/components/shell/toaster/toaster";
import { findActiveTraceparent } from "@/observability/trace-context.server";

import { FONT_VARIABLES } from "./fonts";
import { Telemetry } from "./telemetry";
import "./globals.css";

const SITE_NAME = "nextjs-boilerplate";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Next.js / React のプレゼンテーション層 boilerplate です。",
};

/**
 * 計測の口。
 *
 * @remarks
 * 現在地と要求の文脈（`traceparent`）を読むため、殻の中では決まりません
 * （[0041](../../docs/adr/0041-cache-components-decision.md)）。**描くものを持たないので、待つ間に
 * 見えるものは何も変わりません。**
 */
function TelemetryHole() {
  return <Telemetry traceparent={findActiveTraceparent()} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <TelemetryHole />
        </Suspense>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
