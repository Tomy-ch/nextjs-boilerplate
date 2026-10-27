import { describe, expect, it } from "vitest";

import { displayNameOf } from "./display-name";

describe("displayNameOf", () => {
  // ----- 正常系 -----
  it("姓・名の順に空白 1 つで並べる", () => {
    expect(displayNameOf({ lastName: "山田", firstName: "太郎" })).toBe("山田 太郎");
  });
});
