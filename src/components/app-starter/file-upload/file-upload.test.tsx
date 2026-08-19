// @vitest-environment jsdom

import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { useId } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FileUpload, type FileUploadProps } from "./file-upload";
import { FILE_UPLOAD_REJECTION_REASON } from "./file-upload.definition";

function pngOf(name: string, size: number) {
  const file = new File(["x"], name, { type: "image/png" });

  Object.defineProperty(file, "size", { value: size });

  return file;
}

function choose(input: HTMLElement, files: File[]) {
  fireEvent.change(input, { target: { files } });
}

function inputOf() {
  return screen.getByLabelText("添付画像");
}

function UploadFixture(props: FileUploadProps) {
  const fieldId = useId();

  return (
    <>
      <label htmlFor={fieldId}>添付画像</label>
      <FileUpload id={fieldId} {...props} />
    </>
  );
}

function renderUpload(props: FileUploadProps = {}) {
  return render(<UploadFixture {...props} />);
}

function dropzoneOf() {
  const zone = document.querySelector('[data-slot="file-upload-dropzone"]');

  if (zone === null) {
    throw new Error("dropzone がありません");
  }

  return zone;
}

function drop(files: File[]) {
  fireEvent.drop(dropzoneOf(), { dataTransfer: { files } });
}

class DataTransferStub {
  private readonly added: File[] = [];

  readonly items = {
    add: (file: File) => {
      this.added.push(file);
    },
  };

  get files() {
    return this.added;
  }
}

const filesStore = new WeakMap<HTMLInputElement, File[]>();
const originalFiles = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files");

describe("FileUpload", () => {
  beforeEach(() => {
    vi.stubGlobal("DataTransfer", DataTransferStub);
    Object.defineProperty(HTMLInputElement.prototype, "files", {
      configurable: true,
      get(this: HTMLInputElement) {
        return filesStore.get(this) ?? null;
      },
      set(this: HTMLInputElement, value: File[]) {
        filesStore.set(this, value);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalFiles !== undefined) {
      Object.defineProperty(HTMLInputElement.prototype, "files", originalFiles);
    }
  });

  it("ファイルを選ぶ native の control として公開する", () => {
    renderUpload();

    const input = inputOf();

    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("data-slot", "file-upload-input");
  });

  it("空へ戻す指定では、渡し終えた名前を自分では並べない", () => {
    const onSelect = vi.fn();

    renderUpload({ multiple: true, onSelect, resetOnSelect: true });

    choose(inputOf(), [pngOf("front.png", 10)]);

    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ name: "front.png" })]);
    expect(screen.queryByText("front.png")).not.toBeInTheDocument();
  });

  it("空へ戻す指定では、同じファイルを選び直せる", () => {
    const onSelect = vi.fn();

    renderUpload({ onSelect, resetOnSelect: true });

    choose(inputOf(), [pngOf("front.png", 10)]);
    choose(inputOf(), [pngOf("front.png", 10)]);

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(inputOf()).toHaveValue("");
  });

  it("受け付けたファイルの名前を並べ、onSelect へ渡す", () => {
    const onSelect = vi.fn();

    renderUpload({ multiple: true, onSelect });

    choose(inputOf(), [pngOf("front.png", 10), pngOf("back.png", 20)]);

    expect(onSelect).toHaveBeenCalledWith([
      expect.objectContaining({ name: "front.png" }),
      expect.objectContaining({ name: "back.png" }),
    ]);
    expect(screen.getByText("front.png")).toBeInTheDocument();
    expect(screen.getByText("back.png")).toBeInTheDocument();
  });

  it("accept に合わない形式を弾き、理由を onReject へ渡す", () => {
    const onReject = vi.fn();
    const onSelect = vi.fn();

    renderUpload({ accept: "image/png", onReject, onSelect });

    choose(inputOf(), [new File(["x"], "note.txt", { type: "text/plain" })]);

    expect(onReject).toHaveBeenCalledWith([
      {
        file: expect.objectContaining({ name: "note.txt" }),
        reason: FILE_UPLOAD_REJECTION_REASON.TYPE,
      },
    ]);
    expect(onSelect).toHaveBeenCalledWith([]);
    expect(screen.queryByText("note.txt")).not.toBeInTheDocument();
  });

  it("拡張子と種別の総称でも accept を判定する", () => {
    const onSelect = vi.fn();

    renderUpload({ accept: ".png, image/*", multiple: true, onSelect });

    choose(inputOf(), [pngOf("front.PNG", 10), new File(["x"], "a.gif", { type: "image/gif" })]);

    expect(onSelect).toHaveBeenCalledWith([
      expect.objectContaining({ name: "front.PNG" }),
      expect.objectContaining({ name: "a.gif" }),
    ]);
  });

  it("accept を指定しなければ形式で弾かない", () => {
    const onSelect = vi.fn();

    renderUpload({ onSelect });

    choose(inputOf(), [new File(["x"], "note.txt", { type: "text/plain" })]);

    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ name: "note.txt" })]);
  });

  it("maxSize を超えるものを弾き、収まるものは受け付ける", () => {
    const onReject = vi.fn();
    const onSelect = vi.fn();

    renderUpload({ maxSize: 100, multiple: true, onReject, onSelect });

    choose(inputOf(), [pngOf("small.png", 100), pngOf("large.png", 101)]);

    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ name: "small.png" })]);
    expect(onReject).toHaveBeenCalledWith([
      {
        file: expect.objectContaining({ name: "large.png" }),
        reason: FILE_UPLOAD_REJECTION_REASON.SIZE,
      },
    ]);
  });

  it("弾くものが無ければ onReject を呼ばない", () => {
    const onReject = vi.fn();

    renderUpload({ maxSize: 100, onReject });

    choose(inputOf(), [pngOf("small.png", 10)]);

    expect(onReject).not.toHaveBeenCalled();
  });

  it("accept の空の区切りは何にも一致させない", () => {
    const onReject = vi.fn();

    renderUpload({ accept: ",", onReject });

    choose(inputOf(), [pngOf("front.png", 10)]);

    expect(onReject).toHaveBeenCalledWith([
      {
        file: expect.objectContaining({ name: "front.png" }),
        reason: FILE_UPLOAD_REJECTION_REASON.TYPE,
      },
    ]);
  });

  it("空白だけの accept は指定なしとして扱う", () => {
    const onSelect = vi.fn();

    renderUpload({ accept: "  ", onSelect });

    choose(inputOf(), [new File(["x"], "note.txt", { type: "text/plain" })]);

    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ name: "note.txt" })]);
  });

  it("選択が取り消されたときは空として扱う", () => {
    const onSelect = vi.fn();

    renderUpload({ onSelect });

    choose(inputOf(), [pngOf("front.png", 10)]);
    fireEvent.change(inputOf(), { target: { files: null } });

    expect(onSelect).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText("front.png")).not.toBeInTheDocument();
  });

  it("呼び出し元の onChange も呼ぶ", () => {
    const onChange = vi.fn();

    renderUpload({ onChange });

    choose(inputOf(), [pngOf("front.png", 10)]);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("落としたファイルも同じ検証を通す", () => {
    const onReject = vi.fn();
    const onSelect = vi.fn();

    renderUpload({ accept: "image/png", maxSize: 100, multiple: true, onReject, onSelect });

    drop([pngOf("small.png", 10), new File(["x"], "note.txt", { type: "text/plain" })]);

    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ name: "small.png" })]);
    expect(onReject).toHaveBeenCalledWith([
      {
        file: expect.objectContaining({ name: "note.txt" }),
        reason: FILE_UPLOAD_REJECTION_REASON.TYPE,
      },
    ]);
    expect(screen.getByText("small.png")).toBeInTheDocument();
  });

  it("落としたファイルを input へ書き戻し、native form の送信に載せる", () => {
    renderUpload();

    drop([pngOf("front.png", 10)]);

    expect(inputOf()).toHaveProperty("files", [expect.objectContaining({ name: "front.png" })]);
  });

  it("multiple でなければ落としたうちの先頭 1 件だけを受け付ける", () => {
    const onSelect = vi.fn();

    renderUpload({ onSelect });

    drop([pngOf("front.png", 10), pngOf("back.png", 20)]);

    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ name: "front.png" })]);
  });

  it("ドラッグ中は領域を強調し、離れると戻す", () => {
    renderUpload();

    fireEvent.dragOver(dropzoneOf());

    expect(dropzoneOf()).toHaveAttribute("data-dragging", "true");

    fireEvent.dragLeave(dropzoneOf(), { relatedTarget: document.body });

    expect(dropzoneOf()).not.toHaveAttribute("data-dragging");
  });

  it("領域の内側へ移っただけでは強調を解かない", () => {
    renderUpload();

    fireEvent.dragOver(dropzoneOf());

    const leaving = createEvent.dragLeave(dropzoneOf());

    Object.defineProperty(leaving, "relatedTarget", { value: inputOf() });
    fireEvent(dropzoneOf(), leaving);

    expect(dropzoneOf()).toHaveAttribute("data-dragging", "true");
  });

  it("領域全体が input の label であり、押せば選択ダイアログが開く", () => {
    renderUpload();

    expect(dropzoneOf().tagName).toBe("LABEL");
    expect(dropzoneOf()).toHaveAttribute("for", inputOf().getAttribute("id"));
  });

  it("id を渡さなければ自前で採番して label と結び付ける", () => {
    const { container } = render(<FileUpload />);

    const zone = container.querySelector('[data-slot="file-upload-dropzone"]');
    const control = container.querySelector('[data-slot="file-upload-input"]');

    expect(control?.getAttribute("id")).toBeTruthy();
    expect(zone).toHaveAttribute("for", control?.getAttribute("id"));
  });

  it("送信中は drop を受け付けず、強調もしない", () => {
    const onSelect = vi.fn();

    renderUpload({ onSelect, pending: true });

    fireEvent.dragOver(dropzoneOf());
    drop([pngOf("front.png", 10)]);

    expect(onSelect).not.toHaveBeenCalled();
    expect(dropzoneOf()).not.toHaveAttribute("data-dragging");
  });

  it("送信中は操作できない", () => {
    renderUpload({ pending: true });

    expect(inputOf()).toBeDisabled();
  });

  it("disabled でも操作できない", () => {
    renderUpload({ disabled: true });

    expect(inputOf()).toBeDisabled();
  });

  it("progress を渡したときだけ名前のある進捗を表示する", () => {
    const { rerender } = renderUpload();

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    rerender(<UploadFixture pending progress={40} />);

    const progress = screen.getByRole("progressbar", { name: "送信中" });

    expect(progress).toHaveAttribute("aria-valuenow", "40");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderUpload({ pending: true, progress: 40 });

    choose(inputOf(), [pngOf("front.png", 10)]);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
