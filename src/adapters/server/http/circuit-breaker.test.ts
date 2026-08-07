import { describe, expect, it } from "vitest";
import { createCircuitBreaker } from "./circuit-breaker";

const config = { failureRate: 0.5, sampleSize: 4, openMs: 5_000, halfOpenProbes: 2 };

function createClock(): { now: () => number; advance: (ms: number) => void } {
  let current = 0;

  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

function fail(breaker: ReturnType<typeof createCircuitBreaker>, times: number): void {
  for (let count = 0; count < times; count += 1) {
    breaker.record(false);
  }
}

describe("正常系", () => {
  describe("createCircuitBreaker", () => {
    it("観測が足りないうちは遮断しない", () => {
      const breaker = createCircuitBreaker(config, createClock().now);

      fail(breaker, config.sampleSize - 1);

      expect(breaker.canAttempt()).toBe(true);
    });
    it("失敗率が閾値未満なら遮断しない", () => {
      const breaker = createCircuitBreaker(config, createClock().now);

      breaker.record(false);
      breaker.record(true);
      breaker.record(true);
      breaker.record(true);

      expect(breaker.state()).toBe("closed");
    });
    it("遮断時間が過ぎたら試験的に通す", () => {
      const clock = createClock();
      const breaker = createCircuitBreaker(config, clock.now);

      fail(breaker, config.sampleSize);
      clock.advance(config.openMs);

      expect(breaker.canAttempt()).toBe(true);
      expect(breaker.state()).toBe("half-open");
    });
    it("試験的な試行が続けて成功したら遮断を解く", () => {
      const clock = createClock();
      const breaker = createCircuitBreaker(config, clock.now);

      fail(breaker, config.sampleSize);
      clock.advance(config.openMs);
      breaker.canAttempt();
      breaker.record(true);
      breaker.record(true);

      expect(breaker.state()).toBe("closed");
    });
  });
});

describe("異常系", () => {
  describe("createCircuitBreaker", () => {
    it("失敗率が閾値に達したら遮断する", () => {
      const breaker = createCircuitBreaker(config, createClock().now);

      fail(breaker, config.sampleSize);

      expect(breaker.canAttempt()).toBe(false);
      expect(breaker.state()).toBe("open");
    });
    it("遮断時間が過ぎるまでは通さない", () => {
      const clock = createClock();
      const breaker = createCircuitBreaker(config, clock.now);

      fail(breaker, config.sampleSize);
      clock.advance(config.openMs - 1);

      expect(breaker.canAttempt()).toBe(false);
    });
    it("試験的な試行が失敗したら遮断へ戻す", () => {
      const clock = createClock();
      const breaker = createCircuitBreaker(config, clock.now);

      fail(breaker, config.sampleSize);
      clock.advance(config.openMs);
      breaker.canAttempt();
      breaker.record(false);

      expect(breaker.state()).toBe("open");
    });
    it("遮断へ戻した時点から遮断時間を数え直す", () => {
      const clock = createClock();
      const breaker = createCircuitBreaker(config, clock.now);

      fail(breaker, config.sampleSize);
      clock.advance(config.openMs);
      breaker.canAttempt();
      breaker.record(false);
      clock.advance(config.openMs - 1);

      expect(breaker.canAttempt()).toBe(false);
    });
  });
});
