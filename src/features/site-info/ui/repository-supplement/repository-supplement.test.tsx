// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { Repository } from "../../repositories";
import { RepositorySupplement } from "./repository-supplement";

const repository: Repository = {
  name: "sample-boilerplate",
  url: "https://example.test/sample",
  summary: "1 文の要約。",
  description: "カードに載せる説明。",
  purpose: "何のために作られたか。",
  capabilities: ["できること 1", "できること 2"],
};

describe("RepositorySupplement", () => {
  it("既定では補足を開かず、押せる操作だけを出す", () => {
    render(<RepositorySupplement repository={repository} />);

    expect(screen.getByRole("button", { name: "リポジトリの補足" })).toBeVisible();
    expect(screen.queryByText("何のために作られたか。")).not.toBeInTheDocument();
  });

  it("押すと目的を出す", async () => {
    const user = userEvent.setup();

    render(<RepositorySupplement repository={repository} />);
    await user.click(screen.getByRole("button", { name: "リポジトリの補足" }));

    expect(await screen.findByText("何のために作られたか。")).toBeVisible();
  });

  it("押すとできることを渡された順に並べる", async () => {
    const user = userEvent.setup();

    render(<RepositorySupplement repository={repository} />);
    await user.click(screen.getByRole("button", { name: "リポジトリの補足" }));

    expect((await screen.findAllByRole("listitem")).map((item) => item.textContent)).toEqual([
      "できること 1",
      "できること 2",
    ]);
  });

  it("開いた面の見出しをリポジトリ名にする", async () => {
    const user = userEvent.setup();

    render(<RepositorySupplement repository={repository} />);
    await user.click(screen.getByRole("button", { name: "リポジトリの補足" }));

    expect(await screen.findByText("sample-boilerplate")).toBeVisible();
  });

  it("面の中へリポジトリそのものへの導線を置かない", async () => {
    const user = userEvent.setup();

    render(<RepositorySupplement repository={repository} />);
    await user.click(screen.getByRole("button", { name: "リポジトリの補足" }));
    await screen.findByText("何のために作られたか。");

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("できることが空でも目的だけを出す", async () => {
    const user = userEvent.setup();

    render(<RepositorySupplement repository={{ ...repository, capabilities: [] }} />);
    await user.click(screen.getByRole("button", { name: "リポジトリの補足" }));

    expect(await screen.findByText("何のために作られたか。")).toBeVisible();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(<RepositorySupplement repository={repository} />);

    await user.click(screen.getByRole("button", { name: "リポジトリの補足" }));
    await screen.findByText("何のために作られたか。");

    expect((await axe(container)).violations).toEqual([]);
    expect((await axe(baseElement)).violations).toEqual([]);
  });
});
