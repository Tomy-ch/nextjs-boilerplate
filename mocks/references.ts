import type { DrawFromEndpoint, ReferencePatches } from "./stable-responses";

/**
 * 契約が持つ相互参照と、題材そのものの値の表。
 *
 * @remarks
 * 契約から生成した応答は口ごとに独立しているため、商品が名乗る分類・状態の識別子が、それらを
 * 一覧する口の応答に**存在しません**。画面は選択肢に無い値を「選べない」として扱うので、参照の
 * 整合をここで取ります。
 *
 * **組ごと差し替えます。** 購入ステータスは `id` と業務キーと名称を 1 つの object で持ちます。
 * 項目ごとの指定では組が壊れる（`id` と業務キーを別々に引くことになる）ためです。
 *
 * **噛み合っていなければならない値も同じ理由でここに来ます。** 商品名と分類は互いを指しませんが、
 * 別々に決めると「Tシャツの分類が書籍」になります。生成器は項目を 1 つずつ作るので、組で決まる値を
 * 表せません。
 *
 * **契約ごとの知識なので、機構（`stable-responses.ts`）ではなくこちらが持ちます。** この表は題材と
 * 一緒に破棄され、自分の契約を持つ側は同じ形の表を自分の参照で書きます。
 */

/** 分類マスタの口。seed は要求の URL から決まるので、画面が叩くのと同じ綴りを使う。 */
const CATEGORIES_PATH = "/v1/products/categories";

/** 状態マスタの口。 */
const STATUSES_PATH = "/v1/products/statuses";

/** 購入ステータスマスタの口。 */
const PURCHASE_STATUSES_PATH = "/v1/purchases/statuses";

/** マスタが返す 1 件。識別子と表示名だけを見る。 */
type MasterEntry = { readonly id: string; readonly name: string };

/**
 * 題材の商品。
 *
 * @remarks
 * 分類は名前と噛み合う 1 件を名指します。生成器の既定は 255 文字までのランダム英字で、名前の列が
 * 表の幅を独り占めするため、実在しうる長さでもあります。
 */
const PRODUCT_CATALOGUE = [
  { name: "ワイヤレスイヤホン", categoryName: "家電" },
  { name: "全自動コーヒーメーカー ステンレスサーバー付き", categoryName: "家電" },
  { name: "デスクライト 調光調色", categoryName: "家電" },
  { name: "アロマディフューザー 超音波式", categoryName: "家電" },
  { name: "オーガニックコットン クルーネックTシャツ", categoryName: "衣類" },
  { name: "ランニングシューズ 軽量クッション", categoryName: "衣類" },
  { name: "文庫本カバー 帆布", categoryName: "書籍" },
  { name: "ドリップコーヒー 中煎り 200g", categoryName: "食品" },
  { name: "ステンレス保温マグ 480ml", categoryName: "日用品" },
  { name: "折りたたみ傘 自動開閉 軽量", categoryName: "日用品" },
  { name: "詰め替え用ハンドソープ 800ml", categoryName: "日用品" },
];

/** 応答から、マスタの一覧として読める配列を取り出す。 */
function entriesOf(response: unknown): readonly MasterEntry[] {
  if (!Array.isArray(response)) {
    throw new TypeError("マスタの応答が一覧ではありません");
  }

  return response as readonly MasterEntry[];
}

/**
 * 一覧から 1 件を選ぶ。
 *
 * @remarks
 * どの 1 件を選ぶかは、いま入っている識別子から決めます。要求ごとに同じ結果へ落ちる必要があり、
 * かつ商品ごとに違う分類が付いてほしいためです。
 *
 * `shift` は並びの中での位置です。同じ組の中で選び先を重ねたくないとき（1 つの注文の明細など）に
 * 渡します。
 */
function pick<T>(entries: readonly T[], current: unknown, shift = 0): T {
  const [first] = entries;

  if (first === undefined) {
    throw new Error("マスタの一覧が空です");
  }

  const key = typeof current === "string" ? current : "";
  const offset = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return entries[(offset + shift) % entries.length] ?? first;
}

/** object として読めない応答を弾く。 */
function recordOf(response: unknown, subject: string): Record<string, unknown> {
  if (typeof response !== "object" || response === null) {
    throw new TypeError(`${subject}の応答が object ではありません`);
  }

  return response as Record<string, unknown>;
}

/** 応答が持つ配列を取り出す。 */
function arrayOf(record: Record<string, unknown>, key: string, subject: string): unknown[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new TypeError(`${subject}の応答が ${key} の配列を持ちません`);
  }

  return value;
}

/** object の `id` を読む。差し替えの選び先を決める鍵にする。 */
function idOf(value: unknown): unknown {
  return (value as Record<string, unknown> | null)?.["id"];
}

/** 商品 1 件の名前・分類・状態を、噛み合う組へ揃える。 */
function alignProduct(product: unknown, draw: DrawFromEndpoint): unknown {
  const record = recordOf(product, "商品");

  if (!("category" in record) || !("status" in record)) {
    throw new Error("商品の応答が分類または状態を持ちません");
  }

  const categories = entriesOf(draw("getGetProductCategoriesResponseMock", CATEGORIES_PATH));
  const statuses = entriesOf(draw("getGetProductStatusesResponseMock", STATUSES_PATH));
  const catalogued = pick(PRODUCT_CATALOGUE, record["id"]);
  const category = categories.find((entry) => entry.name === catalogued.categoryName);

  if (category === undefined) {
    throw new Error(`分類マスタに ${catalogued.categoryName} がありません`);
  }

  return {
    ...record,
    name: catalogued.name,
    category,
    status: pick(statuses, idOf(record["status"])),
  };
}

/** 一覧の応答に含まれる商品を、1 件ずつ揃える。 */
function alignProductList(response: unknown, draw: DrawFromEndpoint): unknown {
  const record = recordOf(response, "一覧");

  return {
    ...record,
    products: arrayOf(record, "products", "一覧").map((product) => alignProduct(product, draw)),
  };
}

/** ランキングが並べる商品名を、題材の名前へ揃える。 */
function alignProductRanking(response: unknown): unknown {
  const record = recordOf(response, "ランキング");

  return {
    ...record,
    rankings: arrayOf(record, "rankings", "ランキング").map((entry) => {
      const ranked = recordOf(entry, "ランキングの行");

      return { ...ranked, name: pick(PRODUCT_CATALOGUE, ranked["productId"]).name };
    }),
  };
}

/** 適用したクーポンの識別子。購入をまたいで同じクーポンを指してよいので 1 つで足りる。 */
const APPLIED_COUPON_ID = "0195f0c2-0000-7000-8000-0000000000c1";

/**
 * 購入に適用したクーポンと、それによる値引き額の組。
 *
 * @remarks
 * 契約は「値引きが立っていること」と「クーポンが入っていること」が常に一致し、値引きは小計を
 * 超えないと言っています。生成器は 2 つを別々に引くため、組をこの表から購入ごとに 1 つ選びます。
 *
 * 小計は $10 以上で生成されます（`orval.config.ts`）。定額と上限付きの定率は、その下限でも
 * 成り立つ額を表に持ち、上限の無い定率だけ小計から求めます。
 */
const COUPON_PATTERNS: readonly {
  readonly discount: Record<string, unknown> | null;
  readonly scopeKind: "all" | "category";
  readonly discountOf: (subtotal: number) => number;
}[] = [
  { discount: null, scopeKind: "all", discountOf: () => 0 },
  {
    discount: { kind: "flat", value: "5.00", maxAmount: null },
    scopeKind: "all",
    discountOf: () => 500,
  },
  // $10 以上の 10% は必ず上限の $1.00 に届く。
  {
    discount: { kind: "rate", value: "0.10", maxAmount: 100 },
    scopeKind: "category",
    discountOf: () => 100,
  },
  {
    discount: { kind: "rate", value: "0.15", maxAmount: null },
    scopeKind: "all",
    discountOf: (subtotal) => Math.floor((subtotal * 15) / 100),
  },
];

/** 購入 1 件の値引き額と適用したクーポンを、噛み合う組へ揃える。 */
function alignCoupon(
  record: Record<string, unknown>,
  draw: DrawFromEndpoint,
): Record<string, unknown> {
  const pattern = pick(COUPON_PATTERNS, record["code"]);
  const subtotal = record["subtotalAmount"];

  if (typeof subtotal !== "number") {
    throw new TypeError("購入の応答が小計を持ちません");
  }

  if (pattern.discount === null) {
    return { discountAmount: 0, appliedCoupon: null };
  }

  const targetId =
    pattern.scopeKind === "category"
      ? pick(
          entriesOf(draw("getGetProductCategoriesResponseMock", CATEGORIES_PATH)),
          record["code"],
        ).id
      : null;

  return {
    discountAmount: pattern.discountOf(subtotal),
    appliedCoupon: {
      id: APPLIED_COUPON_ID,
      discount: pattern.discount,
      scope: { kind: pattern.scopeKind, targetId },
    },
  };
}

/**
 * カートの明細の事情。並びの位置で選ぶ。
 *
 * @remarks
 * 生成器は事情を明細ごとに無作為に重ねるため、「在庫が無い」と「在庫がいくつまで」が同じ明細に
 * 並び、買える明細が 1 つも無いカートになります。買える明細と買えない明細を 1 つずつ以上含む組に
 * 揃え、購入確認から確定まで辿れるようにします。
 */
const CART_LINE_PATTERNS: readonly {
  readonly issues: readonly string[];
  readonly availableQuantity: number | null;
}[] = [
  { issues: [], availableQuantity: null },
  { issues: [], availableQuantity: null },
  { issues: ["outOfStock"], availableQuantity: 0 },
];

/** 題材の単価。生成器が置く値と同じ。 */
const CART_UNIT_PRICE = "19.99";

/** 単価を最小単位で表した値。小計を明細から組むために使う。 */
const CART_UNIT_PRICE_MINOR = 1_999;

/**
 * カートの明細と小計を、噛み合う組へ揃える。
 *
 * @remarks
 * 小計は買える明細の単価と数量から決まります。明細と別に引くと、明細を足しても小計が合いません。
 */
function alignCart(response: unknown): unknown {
  const record = recordOf(response, "カート");
  const lines = arrayOf(record, "items", "カート")
    .slice(0, CART_LINE_PATTERNS.length)
    .map((item, index) => {
      const line = recordOf(item, "カートの明細");
      const pattern = CART_LINE_PATTERNS[index];

      if (pattern === undefined) {
        throw new Error("明細の事情の組がありません");
      }

      const quantity = typeof line["quantity"] === "number" ? (line["quantity"] % 3) + 1 : 1;

      return {
        ...line,
        productName: pick(PRODUCT_CATALOGUE, line["productId"], index).name,
        quantity,
        unitPrice: CART_UNIT_PRICE,
        issues: pattern.issues,
        availableQuantity: pattern.availableQuantity,
      };
    });

  return {
    ...record,
    items: lines,
    subtotalAmount: lines
      .filter((line) => line.issues.length === 0)
      .reduce((sum, line) => sum + CART_UNIT_PRICE_MINOR * line.quantity, 0),
  };
}

/** カートの口。候補の値引き額は、このカートの小計に対して決まる。 */
const CART_PATH = "/v1/carts/me";

/**
 * 使えるクーポンの有効期限。並びの位置で選ぶ。
 *
 * @remarks
 * 生成器は期限を基準日（`stable-responses.ts` の `REFERENCE_DATE`）より過去に引くため、「失効済みは
 * 並ばない」契約と食い違います。失効前に見えるよう、基準日より先の固定の日付を置きます。
 */
const CART_COUPON_EXPIRIES = [
  "2027-03-31T14:59:59Z",
  "2027-06-30T14:59:59Z",
  "2027-12-31T14:59:59Z",
];

/**
 * いまのカートに使えるクーポンを、値引きが立つ組だけへ揃える。
 *
 * @remarks
 * 契約はこの一覧に「使用済み・失効済みと、値引きが 0 になるクーポンは並ばない」と言っています。
 * 生成器は値引き額を額面と別に引くため、購入と同じ組の表から値引きの立つ組だけを使い、値引き額は
 * 同じ seed のカートの小計から求めます。
 *
 * 並びの位置で組を選び、**組の数を超える行は落とします**。同じ額面の候補が並ぶと、比べて選ぶ画面に
 * なりません。
 */
function alignCartCoupons(response: unknown, draw: DrawFromEndpoint): unknown {
  const record = recordOf(response, "使えるクーポン");
  const subtotal = recordOf(alignCart(draw("getGetCartsMeResponseMock", CART_PATH)), "カート")[
    "subtotalAmount"
  ];

  if (typeof subtotal !== "number") {
    throw new TypeError("カートの応答が小計を持ちません");
  }

  const patterns = COUPON_PATTERNS.filter((pattern) => pattern.discount !== null);
  const categories = entriesOf(draw("getGetProductCategoriesResponseMock", CATEGORIES_PATH));

  return {
    ...record,
    coupons: arrayOf(record, "coupons", "使えるクーポン")
      .slice(0, patterns.length)
      .map((entry, index) => {
        const pattern = patterns[index];
        const candidate = recordOf(entry, "使えるクーポンの行");
        const coupon = recordOf(candidate["coupon"], "クーポン");

        if (pattern === undefined) {
          throw new Error("値引きの立つ組がありません");
        }

        const targetId =
          pattern.scopeKind === "category" ? pick(categories, coupon["id"]).id : null;

        return {
          ...candidate,
          coupon: {
            ...coupon,
            discount: pattern.discount,
            scope: { kind: pattern.scopeKind, targetId },
            expiresAt: CART_COUPON_EXPIRIES[index % CART_COUPON_EXPIRIES.length],
            usedAt: null,
            usableFrom: null,
            minPurchaseAmount: null,
          },
          discountAmount: pattern.discountOf(subtotal),
        };
      }),
  };
}

/**
 * 購入 1 件のステータスと、明細が名乗る商品名を揃える。
 *
 * @remarks
 * 明細と値引きを持たない応答もあります（一覧の行や遷移の応答）。持っている応答にだけ触れます。
 */
function alignPurchase(purchase: unknown, draw: DrawFromEndpoint): Record<string, unknown> {
  const record = recordOf(purchase, "購入");

  if (!("status" in record)) {
    throw new Error("購入の応答がステータスを持ちません");
  }

  const details = record["details"];
  const named = Array.isArray(details)
    ? details.map((detail, index) => {
        const line = recordOf(detail, "購入の明細");

        // 位置でずらします。明細ごとに識別子から引くと同じ商品が 1 つの注文に何度も並びます。
        return "productName" in line
          ? { ...line, productName: pick(PRODUCT_CATALOGUE, record["code"], index).name }
          : line;
      })
    : undefined;

  const statuses = entriesOf(draw("getGetPurchaseStatusesResponseMock", PURCHASE_STATUSES_PATH));

  return {
    ...record,
    ...(named === undefined ? {} : { details: named }),
    ...("discountAmount" in record ? alignCoupon(record, draw) : {}),
    status: pick(statuses, idOf(record["status"])),
  };
}

/** 一覧の応答に含まれる購入を、1 件ずつ揃える。 */
function alignPurchaseList(response: unknown, draw: DrawFromEndpoint): unknown {
  const record = recordOf(response, "購入一覧");

  return {
    ...record,
    items: arrayOf(record, "items", "購入一覧").map((purchase) => {
      const line = recordOf(purchase, "購入一覧の行");

      return {
        ...alignPurchase(line, draw),
        firstItemName: pick(PRODUCT_CATALOGUE, line["code"]).name,
      };
    }),
  };
}

/**
 * ステータスごとの内訳を、重複しないステータスへ揃える。
 *
 * @remarks
 * 並びの位置で選び、**ステータスの数を超える行は落とします**。識別子から選ぶと同じステータスが
 * 2 行に出ますが、位置で選んでも一周すれば同じことが起きます。内訳の行数はステータスの数を
 * 超えられません。
 */
function alignStatusBreakdown(key: string) {
  return (response: unknown, draw: DrawFromEndpoint): unknown => {
    const record = recordOf(response, "内訳");
    const statuses = entriesOf(draw("getGetPurchaseStatusesResponseMock", PURCHASE_STATUSES_PATH));

    return {
      ...record,
      [key]: arrayOf(record, key, "内訳")
        .slice(0, statuses.length)
        .map((entry, index) => ({
          ...recordOf(entry, "内訳の行"),
          status: statuses[index],
        })),
    };
  };
}

/**
 * 口をまたいで指し合う項目と、組で決まる値を揃える表。
 *
 * @remarks
 * **項目が消えたら落とします。** 契約が変わって参照の項目が無くなったとき、黙って整合が外れると
 * 選択肢に無い値が入った画面になります。落ちれば、契約に追随して表を直す契機になります。
 */
export const REFERENCE_PATCHES: ReferencePatches = new Map([
  ["getGetProductsResponseMock", alignProductList],
  ["getGetProductsLowStockResponseMock", alignProductList],
  ["getGetProductsDetailResponseMock", alignProduct],
  ["getPostProductsResponseMock", alignProduct],
  ["getPatchProductsDetailResponseMock", alignProduct],
  ["getPatchProductsStockResponseMock", alignProduct],
  ["getGetProductsRankingQuantityResponseMock", alignProductRanking],
  ["getGetProductsRankingAmountResponseMock", alignProductRanking],
  ["getGetPurchasesResponseMock", alignPurchaseList],
  ["getGetPurchasesDetailResponseMock", alignPurchase],
  ["getGetCartsMeResponseMock", alignCart],
  ["getPutCartsMeItemResponseMock", alignCart],
  ["getGetCartsMeCouponsResponseMock", alignCartCoupons],
  ["getPatchPurchasesCancelResponseMock", alignPurchase],
  ["getPatchPurchasesPayResponseMock", alignPurchase],
  ["getPatchPurchasesShipResponseMock", alignPurchase],
  ["getPatchPurchasesDeliverResponseMock", alignPurchase],
  ["getGetUsersMePurchasesSummaryResponseMock", alignStatusBreakdown("statusBreakdown")],
  ["getGetDashboardSummaryResponseMock", alignStatusBreakdown("purchaseStatusCounts")],
]);
