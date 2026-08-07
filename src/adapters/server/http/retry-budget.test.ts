import { describe, expect, it } from "vitest";
import { createRetryBudget } from "./retry-budget";

describe("createRetryBudget", () => {
  // ----- 正常系 -----
  it("失敗が続いていなければ再試行を許す", () => {
    expect(createRetryBudget(0.1).canRetry()).toBe(true);
  });

  it("成功で予算が回復する", () => {
    const budget = createRetryBudget(0.1, 10);

    for (let count = 0; count < 6; count += 1) {
      budget.record(false);
    }
    for (let count = 0; count < 20; count += 1) {
      budget.record(true);
    }

    expect(budget.canRetry()).toBe(true);
  });

  it("回復は上限を超えない", () => {
    const budget = createRetryBudget(1, 2);

    budget.record(true);
    budget.record(true);
    budget.record(false);
    budget.record(false);

    expect(budget.canRetry()).toBe(false);
  });
  // ----- 異常系 -----
  it("失敗が続けば再試行を止める", () => {
    const budget = createRetryBudget(0.1, 10);

    for (let count = 0; count < 5; count += 1) {
      budget.record(false);
    }

    expect(budget.canRetry()).toBe(false);
  });

  it("予算は 0 未満へ下がらない", () => {
    const budget = createRetryBudget(1, 2);

    for (let count = 0; count < 5; count += 1) {
      budget.record(false);
    }
    budget.record(true);
    budget.record(true);

    expect(budget.canRetry()).toBe(true);
  });
});
