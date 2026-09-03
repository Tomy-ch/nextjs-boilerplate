import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/**
 * Node 側の interception。
 *
 * @remarks
 * Server Components から出る取得もここを通ります。ブラウザ側だけをモックすると、RSC が実際の
 * バックエンドへ出ていくため、「バックエンド未起動で動く」が成立しません。
 *
 * 配信元（`MEDIA_ORIGIN`）宛は素通しします。mock が差し替えるのは API だけであり、画像は
 * 配信元から取得するためです（[README](README.md)）。
 */
export const mockServer = setupServer(...handlers);
