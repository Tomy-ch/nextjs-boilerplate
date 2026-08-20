// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ATTACHMENT_STATE } from "@/components/app-starter/attachment/attachment.definition";

import { UploadPreview } from "./upload-preview";

const createObjectURL = vi.fn(() => "blob:preview");
const revokeObjectURL = vi.fn();

beforeAll(() => {
  // jsdom は object URL を実装しないため、生涯の呼び出しだけを観測できるように補う。
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

const ITEMS = [
  { description: "1.2 MB", id: "1", name: "cover.png" },
  { description: "0.4 MB", id: "2", name: "handbook.pdf" },
];

/** 送れなかった件。再試行はこの状態にだけ現れる。 */
const FAILED_ITEMS = [
  {
    description: "送信できませんでした。",
    id: "1",
    name: "cover.png",
    state: ATTACHMENT_STATE.ERROR,
  },
];

describe("UploadPreview", () => {
  it("選択中のファイルを名前つきの一覧として並べる", () => {
    render(<UploadPreview items={ITEMS} />);

    const list = screen.getByRole("list", { name: "選択中のファイル" });

    expect(list.querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByText("cover.png")).toBeInTheDocument();
    expect(screen.getByText("1.2 MB")).toBeInTheDocument();
  });

  it("何も選ばれていなければ何も描画しない", () => {
    const { container } = render(<UploadPreview items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("渡さなかった操作の button は出さない", () => {
    render(<UploadPreview items={ITEMS} onRemove={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /を取り消す$/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /を差し替える$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /を再試行する$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /を前へ移動する$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /を後ろへ移動する$/ })).not.toBeInTheDocument();
  });

  it("操作の名前に対象のファイル名を含める", () => {
    const onRemove = vi.fn();
    render(<UploadPreview items={ITEMS} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "handbook.pdf を取り消す" }));

    expect(onRemove).toHaveBeenCalledWith("2");
  });

  it("差し替えを、対象の id とともに呼び出し元へ返す", () => {
    const onReplace = vi.fn();
    render(<UploadPreview items={ITEMS} onReplace={onReplace} />);

    fireEvent.click(screen.getByRole("button", { name: "cover.png を差し替える" }));

    expect(onReplace).toHaveBeenCalledWith("1");
  });

  it("再試行を、対象の id とともに呼び出し元へ返す", () => {
    const onRetry = vi.fn();
    render(<UploadPreview items={FAILED_ITEMS} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "cover.png を再試行する" }));

    expect(onRetry).toHaveBeenCalledWith("1");
  });

  it("送れている件には再試行を出さない", () => {
    render(<UploadPreview items={ITEMS} onRetry={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "cover.png を再試行する" }),
    ).not.toBeInTheDocument();
  });

  it("並び替えを、対象の id とともに呼び出し元へ返す", () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    render(<UploadPreview items={ITEMS} onMoveDown={onMoveDown} onMoveUp={onMoveUp} />);

    fireEvent.click(screen.getByRole("button", { name: "handbook.pdf を前へ移動する" }));
    fireEvent.click(screen.getByRole("button", { name: "cover.png を後ろへ移動する" }));

    expect(onMoveUp).toHaveBeenCalledWith("2");
    expect(onMoveDown).toHaveBeenCalledWith("1");
  });

  it("端の項目は、その先へ動かす操作を押せなくする", () => {
    render(<UploadPreview items={ITEMS} onMoveDown={vi.fn()} onMoveUp={vi.fn()} />);

    expect(screen.getByRole("button", { name: "cover.png を前へ移動する" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "handbook.pdf を後ろへ移動する" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "cover.png を後ろへ移動する" })).toBeEnabled();
  });

  it("横の束では、件を折り返して並べる", () => {
    render(<UploadPreview items={ITEMS} orientation="row" />);

    expect(screen.getByRole("list", { name: "選択中のファイル" })).toHaveClass("flex-wrap");
  });

  it("既定では縦の一覧として並べる", () => {
    render(<UploadPreview items={ITEMS} />);

    expect(screen.getByRole("list", { name: "選択中のファイル" })).toHaveClass("grid");
  });

  it("送信中は操作を止めるが、一覧は残す", () => {
    render(<UploadPreview items={ITEMS} onRemove={vi.fn()} pending />);

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByText("cover.png")).toBeInTheDocument();
  });

  it("File を渡すと表示用 URL を作り、外れるときに破棄する", () => {
    const file = new File(["x"], "cover.png", { type: "image/png" });
    const { unmount } = render(
      <UploadPreview items={[{ id: "1", name: "cover.png", preview: file }]} />,
    );

    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByRole("presentation")).toHaveAttribute("src", "blob:preview");

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("URL を渡した場合は生成も破棄もしない", () => {
    createObjectURL.mockClear();
    render(<UploadPreview items={[{ id: "1", name: "cover.png", preview: "/cover.png" }]} />);

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("presentation")).toHaveAttribute("src", "/cover.png");
  });

  it("preview を渡さなければ画像を出さない", () => {
    render(<UploadPreview items={ITEMS} />);

    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });

  it("state は見た目だけを変え、支援技術へは description で伝える", () => {
    render(
      <UploadPreview
        items={[
          {
            description: "送信に失敗しました",
            id: "1",
            name: "cover.png",
            state: ATTACHMENT_STATE.ERROR,
          },
        ]}
      />,
    );

    expect(screen.getByText("送信に失敗しました")).toBeInTheDocument();
    expect(screen.getByRole("list").querySelector("li")?.textContent).toContain("cover.png");
  });

  it("送信中は再試行を spinner へ差し替える", () => {
    render(
      <UploadPreview
        items={[
          {
            description: "再送信しています",
            id: "1",
            name: "cover.png",
            state: ATTACHMENT_STATE.UPLOADING,
          },
        ]}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /を再試行する$/ })).not.toBeInTheDocument();
    expect(document.querySelector("[data-slot='spinner']")).toBeInTheDocument();
    expect(screen.getByText("再送信しています")).toBeInTheDocument();
  });

  it("送信が終われば再試行へ戻る", () => {
    const { rerender } = render(
      <UploadPreview
        items={[{ id: "1", name: "cover.png", state: ATTACHMENT_STATE.UPLOADING }]}
        onRetry={vi.fn()}
      />,
    );

    expect(document.querySelector("[data-slot='spinner']")).toBeInTheDocument();

    rerender(
      <UploadPreview
        items={[{ id: "1", name: "cover.png", state: ATTACHMENT_STATE.ERROR }]}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "cover.png を再試行する" })).toBeInTheDocument();
    expect(document.querySelector("[data-slot='spinner']")).not.toBeInTheDocument();
  });

  it("spinner は装飾として置き、読み上げは description が担う", () => {
    render(
      <UploadPreview
        items={[
          {
            description: "再送信しています",
            id: "1",
            name: "cover.png",
            state: ATTACHMENT_STATE.UPLOADING,
          },
        ]}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(document.querySelector("[data-slot='spinner']")).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <UploadPreview items={ITEMS} onRemove={vi.fn()} onReplace={vi.fn()} onRetry={vi.fn()} />,
    );

    const result = await axe(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});
