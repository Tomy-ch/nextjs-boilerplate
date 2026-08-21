import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { WITHDRAW_CONFLICT_MESSAGE } from "@/features/admin/users/form-state";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE } from "@/model/session";

const { verifySession, withdrawUser } = vi.hoisted(() => ({
  verifySession: vi.fn(),
  withdrawUser: vi.fn(),
}));

vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));
vi.mock("@/adapters/server/api/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/users")>()),
  withdrawUser,
}));

import { withdrawUserAction } from "./actions";

const USER_ID = "0195f0c2-0000-7000-8000-000000000001";
const USER_NAME = "山田 太郎";

/** 形の上で通る最小の入力。個々のケースは、ここから 1 項目だけ崩す。 */
function withdrawForm(overrides: Readonly<Record<string, string>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    userId: USER_ID,
    userName: USER_NAME,
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== "") form.append(key, value);
  }

  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  verifySession.mockResolvedValue({ subject: "admin", role: SESSION_ROLE.admin });
});

describe("withdrawUserAction", () => {
  // ----- 正常系 -----
  it("受け取った識別子の利用者を退会させる", async () => {
    await withdrawUserAction(idleActionState(), withdrawForm());

    expect(withdrawUser).toHaveBeenCalledWith(USER_ID);
  });

  it("成立したら、結果に対象の呼び名を載せて返す", async () => {
    const state = await withdrawUserAction(idleActionState(), withdrawForm());

    expect(state).toEqual({ status: "success", value: { name: USER_NAME } });
  });

  // ----- 異常系 -----
  it("役割が足りなければ送らずに拒む", async () => {
    verifySession.mockResolvedValue({ subject: "user", role: SESSION_ROLE.user });

    const state = await withdrawUserAction(idleActionState(), withdrawForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.PERMISSION_DENIED });
    expect(withdrawUser).not.toHaveBeenCalled();
  });

  it("対象が届かなければ、開き直す案内を返して送らない", async () => {
    const state = await withdrawUserAction(idleActionState(), withdrawForm({ userId: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: "対象の利用者が判りません。画面を開き直してください。",
    });
    expect(withdrawUser).not.toHaveBeenCalled();
  });

  it("呼び名が届かなければ、結果の文言を組めないので同じく送らない", async () => {
    const state = await withdrawUserAction(idleActionState(), withdrawForm({ userName: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: "対象の利用者が判りません。画面を開き直してください。",
    });
    expect(withdrawUser).not.toHaveBeenCalled();
  });

  it("進行中の購入が残って拒まれたら、対象の呼び名を添えた理由を返す", async () => {
    withdrawUser.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await withdrawUserAction(idleActionState(), withdrawForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.CONFLICT,
      formError: `${USER_NAME} は${WITHDRAW_CONFLICT_MESSAGE}`,
    });
  });

  it("競合以外の失敗は、分類ごとの既定の文言で返す", async () => {
    withdrawUser.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await withdrawUserAction(idleActionState(), withdrawForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.UNAVAILABLE });
    expect(state).not.toMatchObject({ formError: expect.stringContaining(USER_NAME) });
  });
});
