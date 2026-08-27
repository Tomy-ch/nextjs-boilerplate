// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { ProductImages } from "../../use-product-images";
import { ProductImagesSection } from "./images-section";

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

const MAX = 4 * 1024 * 1024;

function imagesOf(overrides: Partial<ProductImages> = {}): ProductImages {
  return {
    items: [],
    imagePaths: [],
    uploading: false,
    failed: false,
    dirty: false,
    add: vi.fn(),
    remove: vi.fn(),
    retry: vi.fn(),
    moveUp: vi.fn(),
    moveDown: vi.fn(),
    ...overrides,
  };
}

function renderSection(images = imagesOf(), rejection?: string) {
  return render(
    <ProductImagesSection
      idPrefix="form"
      images={images}
      maxUploadBytes={MAX}
      onReject={vi.fn()}
      rejection={rejection}
    />,
  );
}

describe("ProductImagesSection", () => {
  it("画像が任意であることを明示する", () => {
    renderSection();

    expect(screen.getByText(/画像が無くても登録できます/)).toBeInTheDocument();
  });

  it("受け付ける形式と大きさを伝える", () => {
    renderSection();

    expect(screen.getByText(/PNG \/ JPEG \/ WebP を 4 MB まで/)).toBeInTheDocument();
  });

  it("選ぶ受け口を置く", () => {
    renderSection();

    expect(screen.getByLabelText(/商品の画像/)).toBeInTheDocument();
  });

  it("選んだファイルを呼び出し元へ渡す", async () => {
    const add = vi.fn();
    renderSection(imagesOf({ add }));

    const input = screen.getByLabelText(/商品の画像/);
    await userEvent.upload(input, [new File(["x"], "cover.png", { type: "image/png" })]);

    expect(add).toHaveBeenCalledWith([expect.objectContaining({ name: "cover.png" })]);
  });

  it("選択中の画像を一覧に並べる", () => {
    renderSection(imagesOf({ items: [{ id: "1", name: "cover.png" }] }));

    expect(screen.getByRole("list", { name: "選択中の商品画像" })).toBeInTheDocument();
    expect(screen.getByText("cover.png")).toBeInTheDocument();
  });

  it("送信に載せる並びを hidden の欄で運ぶ", () => {
    const { container } = renderSection(imagesOf({ imagePaths: ["products/a.png"] }));

    expect(container.querySelector('input[name="images"]')).toHaveValue("products/a.png");
  });

  it("並び替えの操作を渡す", async () => {
    const moveUp = vi.fn();
    renderSection(
      imagesOf({
        items: [
          { id: "1", name: "cover.png" },
          { id: "2", name: "back.png" },
        ],
        moveUp,
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "back.png を前へ移動する" }));

    expect(moveUp).toHaveBeenCalledWith("2");
  });

  it("何も選ばれていなければ一覧そのものを出さない", () => {
    renderSection();

    expect(screen.queryByRole("list", { name: "選択中の商品画像" })).not.toBeInTheDocument();
  });

  it("弾かれたファイルがあれば理由を出す", () => {
    renderSection(imagesOf(), "cover.png は 4 MB を超えています。");

    expect(screen.getByText("cover.png は 4 MB を超えています。")).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSection(
      imagesOf({ items: [{ id: "1", name: "cover.png" }], imagePaths: ["products/a.png"] }),
      "cover.png は 4 MB を超えています。",
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
