// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "./attachment";
import {
  ATTACHMENT_MEDIA_VARIANT,
  ATTACHMENT_ORIENTATION,
  ATTACHMENT_SIZE,
  ATTACHMENT_STATE,
} from "./attachment.definition";

function Fixture() {
  return (
    <Attachment data-testid="attachment">
      <AttachmentMedia data-testid="media">
        <svg aria-hidden="true" />
      </AttachmentMedia>
      <AttachmentContent data-testid="content">
        <AttachmentTitle>仕様書.pdf</AttachmentTitle>
        <AttachmentDescription>1.2 MB</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  );
}

describe("Attachment", () => {
  it("既定では done・default・horizontal の div として名前と補足を表示する", () => {
    render(<Fixture />);

    const attachment = screen.getByTestId("attachment");

    expect(attachment.tagName).toBe("DIV");
    expect(attachment).toHaveAttribute("data-slot", "attachment");
    expect(attachment).toHaveAttribute("data-state", ATTACHMENT_STATE.DONE);
    expect(attachment).toHaveAttribute("data-size", ATTACHMENT_SIZE.DEFAULT);
    expect(attachment).toHaveAttribute("data-orientation", ATTACHMENT_ORIENTATION.HORIZONTAL);
    expect(screen.getByText("仕様書.pdf")).toHaveAttribute("data-slot", "attachment-title");
    expect(screen.getByText("1.2 MB")).toHaveAttribute("data-slot", "attachment-description");
  });

  it("state・size・orientation を data 属性として公開する", () => {
    render(
      <Attachment
        data-testid="attachment"
        orientation={ATTACHMENT_ORIENTATION.VERTICAL}
        size={ATTACHMENT_SIZE.EXTRA_SMALL}
        state={ATTACHMENT_STATE.UPLOADING}
      >
        <AttachmentContent>
          <AttachmentTitle>仕様書.pdf</AttachmentTitle>
        </AttachmentContent>
      </Attachment>,
    );

    const attachment = screen.getByTestId("attachment");

    expect(attachment).toHaveAttribute("data-state", ATTACHMENT_STATE.UPLOADING);
    expect(attachment).toHaveAttribute("data-size", ATTACHMENT_SIZE.EXTRA_SMALL);
    expect(attachment).toHaveAttribute("data-orientation", ATTACHMENT_ORIENTATION.VERTICAL);
  });

  it("state は見た目だけを変え、支援技術へは何も伝えない", () => {
    const { container } = render(
      <Attachment state={ATTACHMENT_STATE.ERROR}>
        <AttachmentContent>
          <AttachmentTitle>仕様書.pdf</AttachmentTitle>
          <AttachmentDescription>送信できませんでした</AttachmentDescription>
        </AttachmentContent>
      </Attachment>,
    );

    expect(container.querySelectorAll("[role]")).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("送信できませんでした")).toBeVisible();
  });

  it("媒体の種類を data 属性として公開する", () => {
    render(
      <Attachment>
        <AttachmentMedia data-testid="media" variant={ATTACHMENT_MEDIA_VARIANT.IMAGE}>
          <svg aria-hidden="true" />
        </AttachmentMedia>
      </Attachment>,
    );

    expect(screen.getByTestId("media")).toHaveAttribute(
      "data-variant",
      ATTACHMENT_MEDIA_VARIANT.IMAGE,
    );
  });

  it("操作にはアクセシブルな名前を与えられ、押下を呼び出し元へ渡す", async () => {
    const onClick = vi.fn();
    render(
      <Attachment>
        <AttachmentContent>
          <AttachmentTitle>仕様書.pdf</AttachmentTitle>
        </AttachmentContent>
        <AttachmentActions data-testid="actions">
          <AttachmentAction aria-label="仕様書.pdf を取り消す" onClick={onClick}>
            <svg aria-hidden="true" />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>,
    );

    const action = screen.getByRole("button", { name: "仕様書.pdf を取り消す" });
    await userEvent.click(action);

    expect(action).toHaveAttribute("data-slot", "attachment-action");
    expect(screen.getByTestId("actions")).toContainElement(action);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("trigger は既定で type=button の button として枠全体を押せるようにする", () => {
    render(
      <Attachment>
        <AttachmentTrigger aria-label="仕様書.pdf を開く" />
        <AttachmentContent>
          <AttachmentTitle>仕様書.pdf</AttachmentTitle>
        </AttachmentContent>
      </Attachment>,
    );

    const trigger = screen.getByRole("button", { name: "仕様書.pdf を開く" });

    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("type", "button");
  });

  it("trigger を asChild で link へ合成すると type を持たない遷移になる", () => {
    render(
      <Attachment>
        <AttachmentTrigger asChild>
          <Link href="/files/1">仕様書.pdf を開く</Link>
        </AttachmentTrigger>
        <AttachmentContent>
          <AttachmentTitle>仕様書.pdf</AttachmentTitle>
        </AttachmentContent>
      </Attachment>,
    );

    const link = screen.getByRole("link", { name: "仕様書.pdf を開く" });

    expect(link).toHaveAttribute("href", "/files/1");
    expect(link).not.toHaveAttribute("type");
  });

  it("枠の中に trigger と個別の操作を同時に置ける", () => {
    render(
      <Attachment>
        <AttachmentTrigger aria-label="仕様書.pdf を開く" />
        <AttachmentContent>
          <AttachmentTitle>仕様書.pdf</AttachmentTitle>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="仕様書.pdf を取り消す">
            <svg aria-hidden="true" />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

describe("AttachmentGroup", () => {
  it("複数の添付を、名前を持つ group としてまとめる", () => {
    render(
      <AttachmentGroup data-testid="group" label="添付した資料">
        <Attachment data-testid="first">
          <AttachmentContent>
            <AttachmentTitle>仕様書.pdf</AttachmentTitle>
          </AttachmentContent>
        </Attachment>
        <Attachment data-testid="second">
          <AttachmentContent>
            <AttachmentTitle>外観.png</AttachmentTitle>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>,
    );

    const group = screen.getByTestId("group");

    expect(group).toHaveAttribute("data-slot", "attachment-group");
    expect(group).toHaveAttribute("role", "group");
    expect(group).toHaveAccessibleName("添付した資料");
    expect(group).toContainElement(screen.getByTestId("first"));
    expect(group).toContainElement(screen.getByTestId("second"));
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <AttachmentGroup>
        <Attachment>
          <AttachmentTrigger aria-label="仕様書.pdf を開く" />
          <AttachmentMedia>
            <svg aria-hidden="true" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>仕様書.pdf</AttachmentTitle>
            <AttachmentDescription>1.2 MB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="仕様書.pdf を取り消す">
              <svg aria-hidden="true" />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment state={ATTACHMENT_STATE.ERROR}>
          <AttachmentContent>
            <AttachmentTitle>外観.png</AttachmentTitle>
            <AttachmentDescription>送信できませんでした</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("AttachmentMedia", () => {
  it("見た目の枠として slot と variant を持つ要素を描画する", () => {
    render(
      <Attachment>
        <AttachmentMedia data-testid="media" variant={ATTACHMENT_MEDIA_VARIANT.ICON}>
          <svg aria-hidden="true" />
        </AttachmentMedia>
      </Attachment>,
    );

    const media = screen.getByTestId("media");

    expect(media).toHaveAttribute("data-slot", "attachment-media");
    expect(media).toHaveAttribute("data-variant", ATTACHMENT_MEDIA_VARIANT.ICON);
  });
});

describe("AttachmentContent", () => {
  it("本文の枠として slot を持つ要素を描画する", () => {
    render(<Fixture />);

    expect(screen.getByTestId("content")).toHaveAttribute("data-slot", "attachment-content");
  });
});

describe("AttachmentTitle", () => {
  it("名称として slot を持つ要素を描画する", () => {
    render(<Fixture />);

    expect(screen.getByText("仕様書.pdf")).toHaveAttribute("data-slot", "attachment-title");
  });
});

describe("AttachmentDescription", () => {
  it("補足として slot を持つ要素を描画する", () => {
    render(<Fixture />);

    expect(screen.getByText("1.2 MB")).toHaveAttribute("data-slot", "attachment-description");
  });
});

describe("AttachmentActions", () => {
  it("操作の枠として slot を持つ要素を描画する", () => {
    render(
      <Attachment>
        <AttachmentActions data-testid="actions">
          <AttachmentAction aria-label="取り消す">×</AttachmentAction>
        </AttachmentActions>
      </Attachment>,
    );

    expect(screen.getByTestId("actions")).toHaveAttribute("data-slot", "attachment-actions");
  });
});

describe("AttachmentAction", () => {
  it("名前を持つ操作として slot を持つ要素を描画する", async () => {
    const onClick = vi.fn();
    render(
      <Attachment>
        <AttachmentActions>
          <AttachmentAction aria-label="仕様書.pdf を取り消す" onClick={onClick}>
            ×
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>,
    );

    const action = screen.getByRole("button", { name: "仕様書.pdf を取り消す" });

    expect(action).toHaveAttribute("data-slot", "attachment-action");

    await userEvent.click(action);

    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("AttachmentTrigger", () => {
  it("既定では button として全体を開く操作にする", () => {
    render(
      <Attachment>
        <AttachmentTrigger aria-label="仕様書.pdf を開く" />
      </Attachment>,
    );

    const trigger = screen.getByRole("button", { name: "仕様書.pdf を開く" });

    expect(trigger).toHaveAttribute("data-slot", "attachment-trigger");
    expect(trigger).toHaveAttribute("type", "button");
  });

  it("asChild で渡した要素を操作の実体にする", () => {
    render(
      <Attachment>
        <AttachmentTrigger asChild>
          <Link href="/files/1">仕様書.pdf を開く</Link>
        </AttachmentTrigger>
      </Attachment>,
    );

    const link = screen.getByRole("link", { name: "仕様書.pdf を開く" });

    expect(link).toHaveAttribute("href", "/files/1");
    expect(link).not.toHaveAttribute("type");
  });
});
