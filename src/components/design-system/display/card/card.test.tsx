// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card", () => {
  it("各領域を合成して表示する", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>設定の概要</CardTitle>
          <CardDescription>確認してください</CardDescription>
          <CardAction>変更</CardAction>
        </CardHeader>
        <CardContent>設定は有効です</CardContent>
        <CardFooter>詳細を見る</CardFooter>
      </Card>,
    );

    expect(screen.getByText("設定の概要")).toHaveAttribute("data-slot", "card-title");
    expect(screen.getByText("確認してください")).toHaveAttribute("data-slot", "card-description");
    expect(screen.getByText("変更")).toHaveAttribute("data-slot", "card-action");
    expect(screen.getByText("設定は有効です")).toHaveAttribute("data-slot", "card-content");
    expect(screen.getByText("詳細を見る")).toHaveAttribute("data-slot", "card-footer");
  });

  it("呼び出し元の className を各領域へ追加する", () => {
    const { container } = render(
      <Card className="w-80">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">見出し</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">本文</CardContent>
        <CardFooter className="border-t border-border">補助操作</CardFooter>
      </Card>,
    );

    expect(container.querySelector('[data-slot="card"]')).toHaveClass("w-80");
    expect(container.querySelector('[data-slot="card-header"]')).toHaveClass("border-b");
    expect(container.querySelector('[data-slot="card-title"]')).toHaveClass("text-lg");
    expect(container.querySelector('[data-slot="card-content"]')).toHaveClass("text-sm");
    expect(container.querySelector('[data-slot="card-footer"]')).toHaveClass("border-t");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>設定の概要</CardTitle>
          <CardDescription>現在の状態を確認できます。</CardDescription>
        </CardHeader>
        <CardContent>設定は有効です。</CardContent>
        <CardFooter>補助情報</CardFooter>
      </Card>,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
