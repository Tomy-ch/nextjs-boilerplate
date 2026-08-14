// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { REPOSITORIES } from "../../repositories";
import { RepositoryLinks } from "./repository-links";

describe("RepositoryLinks", () => {
  it("表に載る全リポジトリへの導線を出す", () => {
    render(<RepositoryLinks />);

    expect(screen.getAllByRole("link")).toHaveLength(REPOSITORIES.length);
  });

  it("リポジトリの名前を導線の名前にする", () => {
    render(<RepositoryLinks />);

    for (const { name } of REPOSITORIES) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
  });

  it("表が持つ URL をそのまま行き先にする", () => {
    render(<RepositoryLinks />);

    for (const { name, url } of REPOSITORIES) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", url);
    }
  });

  it("外部への遷移を別のタブで開き、参照元を渡さない", () => {
    render(<RepositoryLinks />);

    for (const { name } of REPOSITORIES) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("target", "_blank");
      expect(screen.getByRole("link", { name })).toHaveAttribute("rel", "noreferrer");
    }
  });

  it("導線の並びを名前つきの領域にまとめる", () => {
    render(<RepositoryLinks />);

    expect(screen.getByRole("navigation", { name: "リポジトリ" })).toBeVisible();
  });

  it("既定では説明を出さず、フッターを本文と同じ量の文字にしない", () => {
    render(<RepositoryLinks />);

    expect(screen.queryByText(String(REPOSITORIES[0]?.summary))).not.toBeInTheDocument();
  });

  it("hover を持たない利用者にも読めるよう focus で説明を開く", async () => {
    const user = userEvent.setup();

    render(<RepositoryLinks />);
    await user.tab();

    expect(await screen.findByText(String(REPOSITORIES[0]?.summary))).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<RepositoryLinks />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
