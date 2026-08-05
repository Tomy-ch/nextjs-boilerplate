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
