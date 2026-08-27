// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Input } from "../input/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field";

function InvalidField() {
  const controlId = useId();
  const errorId = useId();
  return (
    <Field data-invalid="true">
      <FieldLabel htmlFor={controlId}>連絡先</FieldLabel>
      <FieldContent>
        <Input aria-describedby={errorId} aria-invalid="true" id={controlId} name="contact" />
        <FieldDescription>連絡に使います。</FieldDescription>
        <FieldError id={errorId}>入力内容を確認してください。</FieldError>
      </FieldContent>
    </Field>
  );
}

describe("Field", () => {
  it("label、control、説明、エラーを意味論的に関連付ける", () => {
    render(<InvalidField />);

    const error = screen.getByRole("alert");
    expect(screen.getByLabelText("連絡先")).toHaveAttribute("aria-describedby", error.id);
    expect(error).toHaveTextContent("入力内容を確認してください。");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<InvalidField />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("fieldset、group、horizontal field と補助要素を表示する", () => {
    render(
      <FieldSet>
        <FieldLegend>通知</FieldLegend>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldTitle>更新通知</FieldTitle>
            <Input aria-label="更新通知" name="updates" />
          </Field>
          <FieldSeparator />
          <FieldSeparator>区切り</FieldSeparator>
        </FieldGroup>
      </FieldSet>,
    );
    expect(screen.getByText("通知")).toHaveAttribute("data-slot", "field-legend");
    expect(screen.getByText("更新通知").parentElement).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );
    expect(screen.getByText("区切り")).toBeInTheDocument();
  });
});

describe("FieldSet", () => {
  it("項目の束として fieldset の意味論と slot を持つ要素を描画する", () => {
    const { container } = render(
      <FieldSet>
        <FieldLegend>連絡先</FieldLegend>
      </FieldSet>,
    );

    expect(container.querySelector("fieldset")).toHaveAttribute("data-slot", "field-set");
  });
});

describe("FieldLegend", () => {
  it("束の見出しとして group の名前になる", () => {
    render(
      <FieldSet>
        <FieldLegend>連絡先</FieldLegend>
      </FieldSet>,
    );

    expect(screen.getByRole("group", { name: "連絡先" })).toBeInTheDocument();
    expect(screen.getByText("連絡先")).toHaveAttribute("data-slot", "field-legend");
  });
});

describe("FieldGroup", () => {
  it("複数の項目をまとめる枠として slot を持つ要素を描画する", () => {
    render(<FieldGroup>まとまり</FieldGroup>);

    expect(screen.getByText("まとまり")).toHaveAttribute("data-slot", "field-group");
  });
});

describe("FieldContent", () => {
  it("control と補足を収める枠として slot を持つ要素を描画する", () => {
    render(<FieldContent>本文</FieldContent>);

    expect(screen.getByText("本文")).toHaveAttribute("data-slot", "field-content");
  });
});

function LabelledField() {
  const controlId = useId();

  return (
    <Field>
      <FieldLabel htmlFor={controlId}>連絡先</FieldLabel>
      <Input id={controlId} name="contact" />
    </Field>
  );
}

describe("FieldLabel", () => {
  it("control と結び付く label として描画する", () => {
    render(<LabelledField />);

    expect(screen.getByLabelText("連絡先")).toBeInTheDocument();
    expect(screen.getByText("連絡先")).toHaveAttribute("data-slot", "field-label");
  });
});

describe("FieldTitle", () => {
  it("見出しとして slot を持つ要素を描画する", () => {
    render(<FieldTitle>題名</FieldTitle>);

    expect(screen.getByText("題名")).toHaveAttribute("data-slot", "field-title");
  });
});

describe("FieldDescription", () => {
  it("補足として slot を持つ要素を描画する", () => {
    render(<FieldDescription>連絡に使います。</FieldDescription>);

    expect(screen.getByText("連絡に使います。")).toHaveAttribute("data-slot", "field-description");
  });
});

describe("FieldSeparator", () => {
  it("区切りとして slot を持つ要素を描画する", () => {
    const { container } = render(<FieldSeparator />);

    expect(container.querySelector('[data-slot="field-separator"]')).not.toBeNull();
  });
});

describe("FieldError", () => {
  it("エラーを即時に読み上げられる領域として描画する", () => {
    render(<FieldError>入力内容を確認してください。</FieldError>);

    const error = screen.getByText("入力内容を確認してください。");

    expect(error).toHaveAttribute("data-slot", "field-error");
    expect(error).toHaveAttribute("role", "alert");
  });
});
