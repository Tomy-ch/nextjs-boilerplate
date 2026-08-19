"use client";

import type { ReactNode } from "react";
import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/components/cn";
import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { ListItemContent, ListItemTitle } from "@/components/design-system/display/list/list";
import { Stepper, StepperItem } from "@/components/design-system/display/stepper/stepper";
import { STEPPER_STATE } from "@/components/design-system/display/stepper/stepper.definition";

/** 入力の段階 1 つ。 */
export type WizardStep = {
  /** 段階を識別する値。 */
  id: string;
  /** 進捗と見出しに出す段階の名前。 */
  title: string;
  /** この段階で入力する内容。 */
  content: ReactNode;
  /** この段階を終えられないか。次へ進む操作を押せなくする。 */
  blocked?: boolean;
};

/**
 * 段階の並び。1 件以上を型で要求する。
 *
 * 段階が 0 件の wizard は表示するものが無く、先頭要素を読んだ時点で壊れるため、渡せない
 * 状態にしておく。
 */
export type WizardSteps = readonly [WizardStep, ...WizardStep[]];

/** {@link WizardForm} の props。 */
export type WizardFormProps = {
  /** この入力全体のアクセシブルな名前。 */
  label: string;
  /** 段階の定義。並び順がそのまま進む順になる。 */
  steps: WizardSteps;
  /** 最後の段階で「次へ」の代わりに置く操作。送信は呼び出し元が持つ。 */
  submit: ReactNode;
  /** 前の段階へ戻る操作の文言。 */
  previousLabel?: string;
  /** 次の段階へ進む操作の文言。 */
  nextLabel?: string;
  /** 外枠の class。 */
  className?: string;
};

/**
 * 複数段階に分けた入力の枠を提供する client island。
 *
 * @remarks
 * 持つのは**今どの段階に居るかと、その行き来だけ**である。各段階の field、検証規則、送信、途中
 * 保存はいずれも呼び出し元が持つ。進めてよいかは `blocked` として渡す。
 *
 * **すべての段階を DOM へ残し、現在以外を `hidden` で隠す。** 段階ごとに unmount すると、
 * `<form action>` で送信したときに他の段階の入力値が送られない。`hidden` なら値は form に残った
 * まま、支援技術と layout からは外れる。
 *
 * 最後の段階で置く操作と「次へ」には別々の `key` を与える。同じ位置の `button` として reconcile
 * されると React が DOM 要素を使い回し、押した瞬間に `type` が `button` から `submit` へ書き換わる。
 * click の既定動作は handler の後に走るため、進んだうえで form まで送信されてしまう。
 *
 * 段階が変わったら、その段階の領域へ focus を移す。移さないと操作した button に focus が残り、
 * keyboard と読み上げの利用者には何が変わったのか伝わらない。最初の表示では移さない。
 *
 * 進捗の表示は `Stepper` を合成する。段階の並びと現在位置の意味論はそちらが持つ。
 *
 * @example
 * ```tsx
 * <WizardForm
 *   label="利用申請"
 *   steps={[
 *     { id: "applicant", title: "申請者", content: <ApplicantFields /> },
 *     { id: "confirm", title: "確認", content: <Confirmation /> },
 *   ]}
 *   submit={<Button type="submit">申請する</Button>}
 * />
 * ```
 *
 * @param props.label - この入力全体のアクセシブルな名前。
 * @param props.steps - 段階の定義。
 * @param props.submit - 最後の段階で置く操作。
 *
 * @see Storybook `Form/WizardForm`
 */
export function WizardForm({
  label,
  steps,
  submit,
  previousLabel = "戻る",
  nextLabel = "次へ",
  className,
}: WizardFormProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const panelId = useId();
  const movedRef = useRef(false);
  const currentPanelId = `${panelId}-${steps[currentIndex].id}`;

  // 段階が変わったときだけ focus を移す。最初の表示で移すと、開いた直後に読み上げが飛ぶ。
  useEffect(() => {
    if (!movedRef.current) return;

    document.getElementById(currentPanelId)?.focus();
  }, [currentPanelId]);

  const goPrevious = useCallback(() => {
    movedRef.current = true;
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    movedRef.current = true;
    setCurrentIndex((index) => Math.min(steps.length - 1, index + 1));
  }, [steps.length]);

  const current = steps[currentIndex];
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className={cn("flex flex-col gap-6", className)} data-slot="wizard-form">
      <Stepper label={`${label}の進捗`}>
        {steps.map((step, index) => (
          <StepperItem key={step.id} marker={index + 1} state={stepState(index, currentIndex)}>
            <ListItemContent>
              <ListItemTitle>{step.title}</ListItemTitle>
            </ListItemContent>
          </StepperItem>
        ))}
      </Stepper>

      {steps.map((step, index) => (
        <StepPanel
          active={index === currentIndex}
          id={`${panelId}-${step.id}`}
          key={step.id}
          title={step.title}
        >
          {step.content}
        </StepPanel>
      ))}

      <div
        className="flex flex-wrap items-center justify-end gap-2"
        data-slot="wizard-form-actions"
      >
        <Button
          disabled={currentIndex === 0}
          onClick={goPrevious}
          type="button"
          variant={BUTTON_VARIANT.OUTLINE}
        >
          {previousLabel}
        </Button>
        {isLast ? (
          <Fragment key="submit">{submit}</Fragment>
        ) : (
          <Button disabled={current.blocked} key="next" onClick={goNext} type="button">
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/** 進捗の状態を現在位置から導く。 */
function stepState(index: number, currentIndex: number) {
  if (index < currentIndex) return STEPPER_STATE.COMPLETE;
  if (index === currentIndex) return STEPPER_STATE.CURRENT;

  return STEPPER_STATE.UPCOMING;
}

/**
 * 段階 1 つぶんの領域。
 *
 * 現在の段階以外も DOM へ残すため、`hidden` で隠す。form の値を保つのが目的なので、
 * `display: none` を class で当てるのではなく属性で隠す。
 *
 * 段階は form control の集合なので `fieldset` で表し、段階名を `legend` として与える。
 *
 * focus は移すが輪は描かない。操作した直後に中身が目に見えて変わるため、輪が足す情報が無く、pointer で操作した人には押した場所と無関係な枠が現れることになる。行き先は要素の名前が伝える。`legend` は
 * flex の流れから外れて描かれるため `gap` が効かない。段階名と最初の入力が詰まらないよう、
 * `legend` 自身へ下の余白を持たせる。
 */
function StepPanel({
  active,
  children,
  id,
  title,
}: {
  active: boolean;
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <fieldset
      className="flex min-w-0 flex-col gap-3 outline-hidden"
      data-slot="wizard-form-step"
      hidden={!active}
      id={id}
      tabIndex={-1}
    >
      <legend className="mb-3 font-emphasis text-base">{title}</legend>
      {children}
    </fieldset>
  );
}
