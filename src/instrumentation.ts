/**
 * Next.js がサーバーインスタンスの準備時に自動実行する起動フック。
 *
 * Edge runtime ではファイル読込を行わず、Node.js runtime に限って server Config の bootstrap を委譲する。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapConfig } = await import("./config/bootstrap.server");
    await bootstrapConfig();
  }
}
