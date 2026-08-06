import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("条件付きの class 名を連結する", () => {
    expect(cn("flex", false, undefined, "items-center")).toBe("flex items-center");
  });

  it("競合する Tailwind utility は最後の指定を残す", () => {
    expect(cn("px-2", "px-4", "text-sm", "text-base")).toBe("px-4 text-base");
  });
});
