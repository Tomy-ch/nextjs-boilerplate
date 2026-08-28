// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

type TelemetryMocks = {
  pathname: string;
  params: Record<string, string | string[]>;
  onWebVital: (metric: unknown) => void;
  reportWebVital: Mock;
  reportClientError: Mock;
  startBrowserTracing: Mock;
};

const mocks = vi.hoisted<TelemetryMocks>(() => ({
  pathname: "/",
  params: {},
  onWebVital: () => undefined,
  reportWebVital: vi.fn(),
  reportClientError: vi.fn(),
  startBrowserTracing: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useParams: () => mocks.params,
}));

vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (report: (metric: unknown) => void) => {
    mocks.onWebVital = report;
  },
}));

vi.mock("@/adapters/client/telemetry/report-telemetry", () => ({
  reportWebVital: mocks.reportWebVital,
  reportClientError: mocks.reportClientError,
}));

vi.mock("@/adapters/client/telemetry/browser-tracer", () => ({
  startBrowserTracing: mocks.startBrowserTracing,
}));

import { Telemetry } from "./telemetry";

const TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

const measurement = { name: "LCP", value: 1234.5, rating: "good", navigationType: "navigate" };

function throwUncaught(error: unknown): void {
  window.dispatchEvent(new ErrorEvent("error", { error }));
}

beforeEach(() => {
  mocks.pathname = "/docs/42";
  mocks.params = { slug: "42" };
  mocks.onWebVital = () => undefined;
  mocks.reportWebVital.mockReset();
  mocks.reportClientError.mockReset();
  mocks.startBrowserTracing.mockReset();
});

describe("Telemetry", () => {
  it("器の見た目に何も足さない", () => {
    const { container } = render(<Telemetry traceparent={TRACEPARENT} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("計装を、画面を組んだ要求の trace と併せて立ち上げる", async () => {
    render(<Telemetry traceparent={TRACEPARENT} />);
    await vi.waitFor(() => {
      expect(mocks.startBrowserTracing).toHaveBeenCalledWith(TRACEPARENT);
    });
  });

  it("測定を route の型と併せて送る", () => {
    render(<Telemetry traceparent={TRACEPARENT} />);

    mocks.onWebVital(measurement);

    expect(mocks.reportWebVital).toHaveBeenCalledWith(measurement, "/docs/[slug]");
  });

  it("client 遷移の後も、測定は読み込みが始まった route へ紐づける", () => {
    const { rerender } = render(<Telemetry traceparent={TRACEPARENT} />);

    mocks.pathname = "/terms";
    mocks.params = {};
    rerender(<Telemetry traceparent={TRACEPARENT} />);
    mocks.onWebVital(measurement);

    expect(mocks.reportWebVital).toHaveBeenCalledWith(measurement, "/docs/[slug]");
  });

  it("client 遷移の後の例外は、遷移後の route と併せて送る", () => {
    const error = new Error("遷移後に壊れた");
    const { rerender } = render(<Telemetry traceparent={TRACEPARENT} />);

    mocks.pathname = "/terms";
    mocks.params = {};
    rerender(<Telemetry traceparent={TRACEPARENT} />);
    throwUncaught(error);

    expect(mocks.reportClientError).toHaveBeenCalledWith(error, "/terms", TRACEPARENT);
  });

  it("捕捉されない例外を、起きた時点の route と併せて送る", () => {
    const error = new Error("読めない");

    render(<Telemetry traceparent={TRACEPARENT} />);
    throwUncaught(error);

    expect(mocks.reportClientError).toHaveBeenCalledWith(error, "/docs/[slug]", TRACEPARENT);
  });

  it("捕捉されない reject を送る", () => {
    render(<Telemetry traceparent={TRACEPARENT} />);

    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("解決しない") }),
    );

    expect(mocks.reportClientError).toHaveBeenCalledWith(
      new Error("解決しない"),
      "/docs/[slug]",
      TRACEPARENT,
    );
  });

  it("値を伴わない例外では、報告された文言を送る", () => {
    render(<Telemetry traceparent={TRACEPARENT} />);

    window.dispatchEvent(new ErrorEvent("error", { message: "Script error." }));

    expect(mocks.reportClientError).toHaveBeenCalledWith(
      "Script error.",
      "/docs/[slug]",
      TRACEPARENT,
    );
  });

  it("画面を離れると見張りを外す", () => {
    const { unmount } = render(<Telemetry traceparent={TRACEPARENT} />);

    unmount();
    window.dispatchEvent(new ErrorEvent("error", { message: "離れた後" }));
    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("離れた後の reject") }),
    );

    expect(mocks.reportClientError).not.toHaveBeenCalled();
  });

  // ----- 例外が上限に達したとき -----
  it("上限を超えた例外を送らない", () => {
    render(<Telemetry traceparent={TRACEPARENT} />);

    for (let index = 0; index < 10; index += 1) {
      window.dispatchEvent(new ErrorEvent("error", { message: `${index}` }));
    }

    expect(mocks.reportClientError).toHaveBeenCalledTimes(8);
  });
});
