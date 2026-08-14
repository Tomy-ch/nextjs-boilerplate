// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { REPOSITORIES } from "../../repositories";
import { RepositoryCards } from "./repository-cards";

describe("RepositoryCards", () => {
  it("表に載る全リポジトリのカードを出す", () => {
    render(<RepositoryCards />);

    expect(screen.getAllByRole("link")).toHaveLength(REPOSITORIES.length);
  });

  it("リポジトリ名を遷移先の名前にする", () => {
    render(<RepositoryCards />);

    for (const { name, url } of REPOSITORIES) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", url);
    }
  });

  it("フッターの導線より詳しい説明をカードへ載せる", () => {
    render(<RepositoryCards />);

    for (const { description } of REPOSITORIES) {
      expect(screen.getByText(description)).toBeVisible();
    }
  });

  it("外部への遷移を別のタブで開き、参照元を渡さない", () => {
    render(<RepositoryCards />);

    for (const { name } of REPOSITORIES) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("target", "_blank");
      expect(screen.getByRole("link", { name })).toHaveAttribute("rel", "noreferrer");
    }
  });

  it("カードごとに補足を開く操作を持つ", () => {
    render(<RepositoryCards />);

    expect(screen.getAllByRole("button", { name: "リポジトリの補足" })).toHaveLength(
      REPOSITORIES.length,
    );
  });

  it("カード全体を link で包まず、補足の操作を link の内側へ入れない", () => {
    render(<RepositoryCards />);

    for (const trigger of screen.getAllByRole("button", { name: "リポジトリの補足" })) {
      expect(trigger.closest("a")).toBeNull();
    }
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<RepositoryCards />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
