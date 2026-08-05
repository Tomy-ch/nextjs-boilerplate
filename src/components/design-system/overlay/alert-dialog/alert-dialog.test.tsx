// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

function Example() {
  return (
    <AlertDialog>
      <AlertDialogTrigger>開く</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確認</AlertDialogTitle>
          <AlertDialogDescription>続行しますか？</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>戻る</AlertDialogCancel>
          <AlertDialogAction>続行</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
describe("AlertDialog", () => {
  it("開閉と確認 dialog の意味論を提供する", async () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("alertdialog", { name: "確認" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Example />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
