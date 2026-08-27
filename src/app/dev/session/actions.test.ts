import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE } from "@/model/session";

const {
  discardTestSession,
  isDevelopmentAccessAllowed,
  issueDevelopmentAccessToken,
  issueTestSession,
  redirect,
  revalidatePath,
} = vi.hoisted(() => ({
  discardTestSession: vi.fn(),
  isDevelopmentAccessAllowed: vi.fn(),
  issueDevelopmentAccessToken: vi.fn(),
  issueTestSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/adapters/server/auth/development-access", () => ({ isDevelopmentAccessAllowed }));
vi.mock("@/adapters/server/auth/development-token", () => ({ issueDevelopmentAccessToken }));
vi.mock("@/adapters/server/auth/test-session", () => ({ discardTestSession, issueTestSession }));

import { discardDevSessionAction, issueDevSessionAction } from "./actions";

const CLOSED_MESSAGE = "この口は、開発と CI の手元の宛先でだけ開きます。";

/** 妥当な指定の一式。個々の試験は、ここから 1 項目だけを変える。 */
function submission(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();

  for (const [name, value] of Object.entries({
    subject: "dev-user",
    role: SESSION_ROLE.user,
    expiresInSeconds: "3600",
    accessToken: "",
    issuerUrl: "https://idp.example.test",
    ...overrides,
  })) {
    formData.set(name, value);
  }

  return formData;
}

/** redirect は例外で処理を切るため、送り先だけを取り出す。 */
async function issueAndCatch(formData: FormData): Promise<string | undefined> {
  try {
    await issueDevSessionAction(idleActionState(), formData);
  } catch {
    return redirect.mock.calls.at(-1)?.[0];
  }

  return undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  isDevelopmentAccessAllowed.mockResolvedValue(true);
  issueDevelopmentAccessToken.mockResolvedValue("issued-token");
});

describe("issueDevSessionAction", () => {
  // ----- 正常系 -----
  it("指定どおりに session を発行する", async () => {
    await issueAndCatch(submission({ role: SESSION_ROLE.admin, subject: "user-jane-smith" }));

    expect(issueTestSession).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresInSeconds: 3600,
        role: SESSION_ROLE.admin,
        subject: "user-jane-smith",
      }),
    );
  });

  it("発行したら戻り先へ送る", async () => {
    expect(await issueAndCatch(submission({ returnUrl: "/checkout" }))).toBe("/checkout");
  });

  it("戻り先の指定が無ければ入口へ送る", async () => {
    expect(await issueAndCatch(submission())).toBe("/");
  });

  it("取りに行く指定なら、その主体のトークンを取って載せる", async () => {
    await issueAndCatch(submission({ issueAccessToken: "on", subject: "user-john-doe" }));

    expect(issueDevelopmentAccessToken).toHaveBeenCalledWith({
      subject: "user-john-doe",
      issuer: "https://idp.example.test",
    });
    expect(issueTestSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "issued-token" }),
    );
  });

  it("認可の往復の途中の送信は、この口へは来ない", async () => {
    // 素の form が `/dev/session/authorize` へ送るため、state が載っていても分岐は起きない。
    await issueAndCatch(submission({ state: "tx-state", returnUrl: "/checkout" }));

    expect(issueTestSession).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenLastCalledWith("/checkout");
  });

  it("取りに行かない指定なら、口を叩かない", async () => {
    await issueAndCatch(submission());

    expect(issueDevelopmentAccessToken).not.toHaveBeenCalled();
  });

  it("経路の指定と接続先を、発行の指定として持ち回らない", async () => {
    await issueAndCatch(submission({ issueAccessToken: "on" }));

    expect(issueTestSession).toHaveBeenCalledWith(
      expect.not.objectContaining({ issueAccessToken: expect.anything() }),
    );
    expect(issueTestSession).toHaveBeenCalledWith(
      expect.not.objectContaining({ issuer: expect.anything() }),
    );
  });

  // ----- 異常系 -----
  it("接続先が URL でなければ、取りに行かない", async () => {
    const state = await issueDevSessionAction(
      idleActionState(),
      submission({ issueAccessToken: "on", issuerUrl: "2013" }),
    );

    expect(state).toMatchObject({
      fieldErrors: { issuerUrl: expect.any(Array) },
      status: "error",
    });
    expect(issueDevelopmentAccessToken).not.toHaveBeenCalled();
  });

  it("トークンを取れなければ、session を発行しない", async () => {
    issueDevelopmentAccessToken.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    const state = await issueDevSessionAction(
      idleActionState(),
      submission({ issueAccessToken: "on" }),
    );

    expect(state).toMatchObject({ status: "error" });
    expect(issueTestSession).not.toHaveBeenCalled();
  });

  it("外部のサイトを戻り先に指定されても、自分の中へ倒す", async () => {
    expect(await issueAndCatch(submission({ returnUrl: "https://evil.example.com" }))).toBe("/");
  });

  it("開けない環境では、発行そのものを行わない", async () => {
    isDevelopmentAccessAllowed.mockResolvedValue(false);

    const state = await issueDevSessionAction(idleActionState(), submission());

    expect(state).toMatchObject({ formError: CLOSED_MESSAGE, status: "error" });
    expect(issueTestSession).not.toHaveBeenCalled();
  });

  it("指定が妥当でなければ、項目ごとの理由を返す", async () => {
    const state = await issueDevSessionAction(idleActionState(), submission({ subject: "" }));

    expect(state).toMatchObject({
      fieldErrors: { subject: expect.any(Array) },
      status: "error",
    });
    expect(issueTestSession).not.toHaveBeenCalled();
  });

  it("発行が失敗したら、その分類の文言を返す", async () => {
    issueTestSession.mockRejectedValue(createAppError(ErrorKind.INTERNAL));

    const state = await issueDevSessionAction(idleActionState(), submission());

    expect(state).toMatchObject({
      formError: getDefaultErrorMeta(ErrorKind.INTERNAL).message,
      status: "error",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("discardDevSessionAction", () => {
  // ----- 正常系 -----
  it("session を捨てる", async () => {
    const state = await discardDevSessionAction(idleActionState(), new FormData());

    expect(discardTestSession).toHaveBeenCalledOnce();
    expect(state).toMatchObject({ status: "success" });
  });

  it("捨てたあと、同じ画面を出し直させる", async () => {
    await discardDevSessionAction(idleActionState(), new FormData());

    expect(revalidatePath).toHaveBeenCalledWith("/dev/session");
  });

  it("画面を移さない", async () => {
    await discardDevSessionAction(idleActionState(), new FormData());

    expect(redirect).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("開けない環境では、捨てる操作も行わない", async () => {
    isDevelopmentAccessAllowed.mockResolvedValue(false);

    const state = await discardDevSessionAction(idleActionState(), new FormData());

    expect(state).toMatchObject({ formError: CLOSED_MESSAGE, status: "error" });
    expect(discardTestSession).not.toHaveBeenCalled();
  });

  it("捨てるのが失敗したら、出し直させない", async () => {
    discardTestSession.mockRejectedValue(createAppError(ErrorKind.INTERNAL));

    const state = await discardDevSessionAction(idleActionState(), new FormData());

    expect(state).toMatchObject({
      formError: getDefaultErrorMeta(ErrorKind.INTERNAL).message,
      status: "error",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
