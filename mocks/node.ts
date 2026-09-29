import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/**
 * Node 側の interception。
 *
 * @remarks
 * Server Components から出る取得もここを通ります。ブラウザ側だけをモックすると、RSC が実際の
 * バックエンドへ出ていくため、「バックエンド未起動で動く」が成立しません。
 *
 * 差し替えるのは API の口だけで、配信元（`MEDIA_ORIGIN`）宛のハンドラは持ちません。ハンドラの無い
 * 宛先を素通しするか落とすかは `listen` を呼ぶ側が決めます（[README](README.md)）。
 */
export const mockServer = setupServer(...handlers);
