// 抑止の撤回条件が満たされたか、宣言が様式を満たしているかの判定。読み取りは `scan.ts` が持ち、
// ここは受け取った宣言だけを見る。

import { latestDateIn } from "../lib/withdrawal-date.js";

/** 抑止の宣言 1 件。どの面から来たかと、添えられた撤回条件を持つ。 */
export type Suppression = {
  /** 宣言が置かれている面。報告でそのまま出す。 */
  readonly source: string;
  /**
   * 抑止している対象。
   *
   * @remarks
   * 面によって粒度が違います —— 脆弱性 ID（osv-scanner / trivy）、検出のフィンガープリント
   * （bearer）、規則番号（ZAP）、`<name>@<version>`（冷却の免除）、行ラベル `L<行>`（条件を
   * コメントに持つ面）。
   */
  readonly subject: string;
  /** 撤回条件として添えられた散文。 */
  readonly condition: string;
  /**
   * 宣言を読むスキャナ自身が強制する期限（`YYYY-MM-DD`）。
   *
   * @remarks
   * 期限を項目として持つ面だけが持ちます。過ぎた日からスキャナが抑止を外すので、撤回条件の散文に
   * 書かれた日付より優先します。
   */
  readonly until?: string;
  /** 期限の項目に書かれているが、暦日として読めなかった値。書かれたまま残す。 */
  readonly unreadableUntil?: string;
  /**
   * 冷却の免除。
   *
   * @remarks
   * 供給網の冷却期間を特定の版について外す宣言です。他の抑止と違い、**撤回条件は日付でしか
   * 書けません** —— 免除が要るのは版が窓の内側に居るあいだだけで、窓が明けた日が撤回の日です。
   * 対象も版を名指しする必要があります。名前だけの免除はその名前の将来の版まで外します。
   */
  readonly kind?: "cooldown-exemption";
};

/** 撤回してよいと判定した宣言。 */
export type ExpiredSuppression = Suppression & {
  /** 期限と判定した日付。スキャナが強制する期限、無ければ条件に書かれていた日付。 */
  readonly dueDate: string;
};

/** 様式を満たしていない宣言。 */
export type MalformedSuppression = Suppression & {
  /** 何が欠けているか。1 件の宣言に複数ありうる。 */
  readonly defects: readonly string[];
};

/** 冷却の免除の対象の形。名前に続けて版を名指しする。 */
const VERSIONED_SUBJECT = /^(@[^@\s/]+\/)?[^@\s/]+@\S+/;

/**
 * 撤回条件を満たした宣言を選ぶ。
 *
 * @remarks
 * **判定できるのは日付だけです。** 日付で決まらない条件はここでは満たされたと判定しないので、
 * **呼ぶ側は絞り込んだ結果だけでなく全件も出します**（`index.ts`）。
 *
 * @param suppressions - 読み取った宣言の全件
 * @param today - 判定の基準日（`YYYY-MM-DD`）
 * @returns 期限（スキャナが強制する期限、無ければ条件の最も遅い日付）が基準日以前の宣言。その日付を添える
 */
export function expiredSuppressions(
  suppressions: readonly Suppression[],
  today: string,
): readonly ExpiredSuppression[] {
  return suppressions.flatMap((suppression) => {
    const dueDate = suppression.until ?? latestDateIn(suppression.condition);

    if (dueDate === undefined || dueDate > today) {
      return [];
    }

    return [{ ...suppression, dueDate }];
  });
}

/**
 * 様式を満たしていない宣言を選ぶ。
 *
 * @remarks
 * 理由と撤回条件の**有無**を見ます。妥当かどうかはレビューの判断に残しますが、書かれていない
 * ことまでは機械が落とします —— 空の宣言は、その面の検査を黙って外したのと同じです。
 *
 * 期限の項目を持つ宣言は、理由に日付を書かないことも要求します。期限が 2 か所に住むと、片方だけが
 * 延ばされて、もう片方の日付は誰も見なくなります。
 *
 * 冷却の免除は加えて、対象が版を名指ししていること・条件に日付があることを要求します。
 * 免除の撤回条件は窓が明ける日付でしか書けないので、日付の無い免除は撤回条件を持ちません。
 *
 * @param suppressions - 読み取った宣言の全件
 * @returns 欠けているものが 1 つ以上ある宣言。欠けているものを添える
 */
export function malformedSuppressions(
  suppressions: readonly Suppression[],
): readonly MalformedSuppression[] {
  return suppressions.flatMap((suppression) => {
    const defects: string[] = [];

    if (suppression.condition.trim() === "") {
      defects.push("理由と撤回条件が書かれていない");
    }

    if (suppression.until !== undefined && latestDateIn(suppression.condition) !== undefined) {
      defects.push("期限の項目があるのに理由にも日付がある（理由から日付を外す）");
    }

    if (suppression.unreadableUntil !== undefined) {
      defects.push(
        `期限の項目「${suppression.unreadableUntil}」が暦日として読めない（YYYY-MM-DD で書く）`,
      );
    }

    if (suppression.kind === "cooldown-exemption") {
      if (!VERSIONED_SUBJECT.test(suppression.subject)) {
        defects.push("対象が版を名指ししていない（<name>@<version> の形で書く）");
      }

      if (latestDateIn(suppression.condition) === undefined) {
        defects.push("撤回条件に日付が無い（窓が明ける日を YYYY-MM-DD で書く）");
      }
    }

    return defects.length === 0 ? [] : [{ ...suppression, defects }];
  });
}
