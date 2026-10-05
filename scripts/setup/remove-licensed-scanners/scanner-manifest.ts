// 資格情報を要するスキャナ 1 製品分の撤去宣言。ここはデータだけを持ち、撤去の手順は入口
// ([index.ts](index.ts))が担う。
//
// **文書の記述も一緒に落とす。**ゲートが見るもの（ファイル・pin・宛先の宣言）だけを始末して
// 散文を残すと、撤去したはずの製品が文書の中だけ生き残る。落とす塊・語句・節は完全一致で宣言し、
// 一致しなければ撤去そのものを止める（[scanner-removal.ts](scanner-removal.ts)）。**宣言が現物と
// 一致することは [manifest のテスト](scanner-manifest.test.ts)が毎回見る**ので、ずれは行を動かした
// PR の CI で落ち、複製した側のセットアップまで持ち越さない
// （[README](../../README.md)）。
//
// 宣言し切れない言及は `docMentions` が**報告だけ**する。撤去後も真であり続ける記述（他の検査が
// 使い続ける pin への言及など）がここに残る。

/** 文書から落とす塊。 */
type DocBlock = {
  file: string;
  /** 落とす本文。行を落とすなら末尾の改行まで含める。 */
  block: string;
};

/** 文書の中で置き換える語句。 */
type DocFragment = {
  file: string;
  /** 置き換える前の語句。 */
  fragment: string;
  /** 置き換えた後の語句。空文字なら削除。 */
  replacement: string;
};

/** 文書から落とす節。 */
type DocSection = {
  file: string;
  /** `### 見出し` の形。見出しの形をしていなければ投げる。 */
  heading: string;
};

/** 1 製品分の撤去宣言。パスはリポジトリルート相対。 */
export type ScannerDomain = {
  /** 使い方に並べる短い名前。 */
  key: string;
  /** 人へ見せる名前。 */
  label: string;
  /** commitlint の prefix を含むコミット件名。 */
  commitSubject: string;
  /** これが無ければ撤去済みと見なし、その製品には手を付けない。 */
  presenceMarker: string;
  /** 消すファイルとディレクトリ。 */
  paths: readonly string[];
  /** `.github/egress.yaml` の workflows / audit のキー。 */
  egressJobs: readonly string[];
  /** 撤去後に参照が 0 件になったときだけ消す pin。`owner/repo` で書く。 */
  pinActions: readonly string[];
  /** 文書から落とす塊。完全一致で探す。 */
  docBlocks: readonly DocBlock[];
  /** 文書の中で置き換える語句。完全一致で探す。 */
  docFragments: readonly DocFragment[];
  /** 文書から落とす節。見出しから次の同レベル以上の見出しの直前まで。 */
  docSections: readonly DocSection[];
  /** 撤去後に名前が残っていないかを見る文書。報告するだけで、書き換えない。 */
  docMentions: readonly string[];
  /** 文書の中でこの製品を指す綴り。 */
  mentionPatterns: readonly string[];
};

/** 製品名を載せている文書。撤去後に読み手が掃く先として報告する。 */
const DOCS: readonly string[] = [
  ".github/workflows/README.md",
  "SECURITY.md",
  "docs/adr/0110-security-operations.md",
  "docs/adr/0110-security-operations.ja.md",
  "docs/adr/0153-ci-configuration.md",
  "docs/adr/0153-ci-configuration.ja.md",
  "docs/adr/README.md",
  "docs/adr/README.ja.md",
  "docs/adr/BACKLOG.md", // boilerplate-only:line
  "docs/get-started/setup-repository.md",
];

export const SCANNER_DOMAINS: readonly ScannerDomain[] = [
  {
    key: "sonarcloud",
    label: "SonarQube Cloud",
    commitSubject: "CI: SonarQube Cloud の検査を撤去する",
    presenceMarker: ".github/workflows/sonarcloud.yaml",
    paths: [".github/workflows/sonarcloud.yaml", "sonar-project.properties", "scripts/sonarcloud"],
    egressJobs: ["sonarcloud"],
    pinActions: ["SonarSource/sonarqube-scan-action"],
    docBlocks: [
      {
        file: ".github/workflows/README.md",
        block:
          "| SonarQube Cloud Scan | `sonarcloud.yaml` | `preflight` / `sonarcloud` / `report` / `unconfigured-notice` | **外部アカウントを要する唯一の検査。** `SONAR_TOKEN` が無ければ走らず、緑のまま「未設定」を PR へ述べる。外すかはセットアップの 1 段で選ぶ |\n",
      },
      {
        file: ".github/workflows/README.md",
        block:
          "| `sonarcloud` | CI のみ | 解析を実行するのは SonarCloud 側で、手元には結果を読む口しか無い。そもそも `SONAR_TOKEN` を開発者の環境へ配らない |\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block:
          "- **External analysis service (SonarQube Cloud)**: unlike all the above, the only layer that **depends on an external account**. It is free for public repositories and paid for private ones, so **it is designed with no contract as the default** — if `SONAR_TOKEN` is not set, the whole analysis job steps down, and **it states \"not configured\" on the PR while staying green** (the absence of a comment is indistinguishable from \"the check was green\"). **It is not registered as a required check**. Whether a third party's account exists must not become a condition for merging. **It is not a target of stripping** — whether to keep it is a judgment for whoever knows whether a contract exists, and is chosen in one step of [`docs/get-started/setup-repository.md`](../get-started/setup-repository.md). `projectKey` / `organization` are repository identifiers, so they are rewritten by `make setup-replace-repository-reference` as **identity**, not as settings\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block:
          "- **外部解析サービス(SonarQube Cloud)**: 上のどれとも違い、**外部アカウントに依存する**唯一の層。public リポジトリでは無料、private では有料であるため、**契約が無いことをデフォルトとして設計する** —— `SONAR_TOKEN` が未設定なら解析ジョブごと降り、**緑のまま「未設定」を PR へ述べる**(コメントの不在は「検査が緑だった」と見分けが付かない)。**required check には登録しない**。第三者のアカウントの有無がマージの条件になってはならない。**剥がしの対象にはしない** —— 残すかどうかは契約の有無を知っている側の判断であり、[`docs/get-started/setup-repository.md`](../get-started/setup-repository.md) の 1 段で選ぶ。`projectKey` / `organization` はリポジトリの識別子なので、設定ではなく**アイデンティティ**として `make setup-replace-repository-reference` が書き換える\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block:
          "| `sonar-project.properties` | A pair of one rule × a path (`sonar.issue.ignore.multicriteria`). **SonarCloud has a mechanism for reviewing hotspots in its UI, but it places the decision outside the repository** — the same judgment would not carry over to a duplicated repository, so the suppression the repository holds is limited to this file |\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block:
          "| `sonar-project.properties` | ルール 1 件 × パスの組(`sonar.issue.ignore.multicriteria`)。**SonarCloud は hotspot を UI で review する仕組みを持つが、それはリポジトリの外に決定を置く** —— 複製したリポジトリへ同じ判断が渡らないので、リポジトリが持つ抑止はこのファイルに限る |\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block:
          "**SonarQube Cloud is the exception to this format, and the reasons for its suppressions are not written anywhere else in the repository.** This layer is one whose removal can be chosen, and if it is chosen, `sonar-project.properties` and `.github/workflows/sonarcloud.yaml` disappear together. Placing reasons anywhere else — in source comments or in documents that survive the removal — means that **after the flagged rules vanish, only the reasons remain, and nobody can trace what they are about**.\n\nThe same applies when changing the shape of code in response to this inspection's findings: **neither the rule name nor \"Sonar said so\" is written in comments**. A constraint worth keeping can be written as a property of the place without naming the rule; if it cannot, it is a reason only the suppression file should hold.\n\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block:
          "**SonarQube Cloud はこの様式の例外で、抑止の理由をリポジトリの他の場所へ書かない。** この層は撤去を選べる層であり、選ばれれば `sonar-project.properties` と `.github/workflows/sonarcloud.yaml` は一緒に消える。理由をそれ以外——ソースのコメントや、撤去を生き延びる文書——へ置くと、**指摘した規則ごと消えたあとに理由だけが残り、何の話をしているのか誰にも辿れなくなる**。\n\nこの検査の所見に応じてコードの形を変えるときも同じで、**規則名も「Sonar がこう言った」もコメントに書かない**。残す価値のある制約なら、規則を名指しせずにその場の性質として書けるはずで、書けないならそれは抑止ファイルだけが持つべき理由である。\n\n",
      },
      {
        file: "docs/get-started/setup-repository.md",
        block:
          "| [`sonarcloud.yaml`](../../.github/workflows/sonarcloud.yaml) | SonarQube Cloud のアカウントと `SONAR_TOKEN` |\n",
      },
    ],
    docFragments: [],
    docSections: [{ file: "docs/get-started/setup-repository.md", heading: "### 残す場合" }],
    docMentions: DOCS,
    mentionPatterns: ["SonarQube", "SonarCloud", "sonarcloud", "sonar-project", "SonarSource"],
  },
  {
    key: "dependency-review",
    label: "Dependency Review",
    commitSubject: "CI: Dependency Review の検査を撤去する",
    presenceMarker: ".github/workflows/dependency-review.yaml",
    paths: [".github/workflows/dependency-review.yaml"],
    egressJobs: ["dependency-review"],
    pinActions: ["actions/dependency-review-action"],
    docBlocks: [
      {
        file: ".github/workflows/README.md",
        block:
          "| Dependency Review | `dependency-review.yaml` | `dependency-review` | **この PR が増やした依存**だけを見る。他の依存スキャナが見るのは木の現状で、持ち越しと増分を区別できない。呼ぶ API が無料なのは public のときだけで、private では Code Security のライセンスを要求する。外すかはセットアップの 1 段で選ぶ |\n",
      },
      {
        file: ".github/workflows/README.md",
        block: "| ゲート | `dependency-review` | job の exit code |\n",
      },
      {
        file: "SECURITY.md",
        block: "| **この PR が増やした依存** | Dependency Review | CI（PR の差分だけを見る） |\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block:
          "- **Dependency diff gate (Dependency Review)**: the three above all read **the current state of the tree**, so they cannot distinguish vulnerabilities held from before from ones this change brought in. The former are something a report-only gate structurally has to tolerate, so **a layer that asks only \"did this PR add any\"** is placed separately. Whoever added it can take it back, so this one may fail. The threshold is `high`, aligned with the dependency audit gate. The API it calls is free only for public repositories and requires a Code Security license for private ones — **this is a configuration decision, not a code decision**, so the layer is distributed, and whether to remove it is chosen in one step of setup\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block:
          "- **依存差分ゲート(Dependency Review)**: 上の 3 者はいずれも**ツリーの現状**を読むため、以前から抱えている脆弱性とこの変更が持ち込んだものを区別できない。前者は報告専用のゲートが構造的に許容せざるを得ないものであり、**「この PR が増やしたか」だけを問う層**を別に置く。増やした当人は取り消せるので、ここは落として良い。しきい値は依存監査ゲートと揃えて `high`。呼ぶ API が無料なのは public のときだけで、private では Code Security のライセンスを要求する —— **これは設定の判断であってコードの判断ではない**ので、層は配り、外すかどうかはセットアップの 1 段で選ぶ\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block: "| **Gate** | Dependency Review | The job's own exit code |\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block: "| **ゲート** | Dependency Review | job 自身の exit code |\n",
      },
      {
        file: "docs/get-started/setup-repository.md",
        block:
          "| [`dependency-review.yaml`](../../.github/workflows/dependency-review.yaml) | Dependency graph の有効化（手順 3）。呼ぶ API が無料なのは public のときだけ |\n",
      },
      {
        file: "docs/get-started/setup-repository.md",
        block:
          "   （**このリポジトリでは `dependency-review` job もこれを読む**ため、無効のままだと「このリポジトリでは使えない」で落ちる。設定を入れるまでコード側では直せない）\n",
      },
    ],
    docFragments: [
      {
        file: "docs/adr/0110-security-operations.md",
        fragment: "the dependency audit gate / the dependency diff gate / data-flow inspection",
        replacement: "the dependency audit gate / data-flow inspection",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        fragment: "依存監査ゲート / 依存差分ゲート / データフロー検査",
        replacement: "依存監査ゲート / データフロー検査",
      },
    ],
    docSections: [],
    docMentions: DOCS,
    mentionPatterns: ["Dependency Review", "dependency-review"],
  },
  {
    key: "codeql",
    label: "CodeQL",
    commitSubject: "CI: CodeQL の検査を撤去する",
    presenceMarker: ".github/workflows/codeql.yaml",
    paths: [".github/workflows/codeql.yaml", ".github/codeql"],
    egressJobs: ["codeql"],
    // `github/codeql-action` は残る 4 つの workflow が `upload-sarif` で使い続けるため、
    // 宣言はしても参照が 0 件にならず落ちない。数えて決めるので、ここに書いても安全である。
    pinActions: ["github/codeql-action"],
    docBlocks: [
      {
        file: ".github/workflows/README.md",
        block:
          "| CodeQL Scan | `codeql.yaml` | `codeql` | 同じ問いに GitHub 側の解析で答える。high の検出でマージを止めるのは code scanning 側の設定で、この job が落ちるのは解析そのものが走らなかったときだけ |\n",
      },
      {
        file: ".github/workflows/README.md",
        block:
          "`codeql` には掛けていない。code scanning の alert は「後の解析がもう報告しない」ことでしか閉じず、PR ごとに解析を省くと閉じる契機を落としうる。**GitHub 側の仕組みに judgement を預けている検査なので、こちらの都合で走行回数を減らさない。**\n\n",
      },
      {
        file: "SECURITY.md",
        block: "| 自分が書いたコード | CodeQL | CI。GitHub の中でだけ走る層 |\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block:
          "- **CodeQL SAST**: `languages: javascript-typescript`. Trigger = PR + push to protected branches + weekly cron. SARIF is uploaded with `security-events: write`. High severity blocks merging (the substance of the block lives in the required settings of branch protection / code scanning; it does not rely on a hard fail inside the workflow)\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block:
          "- **CodeQL SAST**: `languages: javascript-typescript`。trigger = PR + 保護ブランチ push + 週次 cron。`security-events: write` で SARIF アップロード。high-severity はマージブロック(ブロックの実体は branch protection / code scanning の required 設定側。workflow 内の hard-fail には依存しない)\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block:
          "| CodeQL | **Does not step down** | Code scanning alerts close only by \"a later analysis no longer reports it\". Reducing the number of runs can drop occasions for closing |\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block:
          "| CodeQL | **降りない** | code scanning の alert は「後の解析がもう報告しない」ことでしか閉じない。走行回数を減らすと閉じる契機を落としうる |\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block:
          "- ❌ Leaning SAST on CodeQL alone (a layer that cannot be carried out is not made the only SAST) (Enforcement: Prose — **mechanizable** (a gate rejecting unless a workflow has a job calling `make sast`; no rule exists))\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block:
          "- ❌ SAST を CodeQL だけに寄せること(持ち出せない層を唯一の SAST にしない)（強制: 散文 —— **寄せられる**（workflow に `make sast` を呼ぶ job が在ることを gate で落とす形。規則は無い））\n",
      },
      {
        file: "docs/get-started/setup-repository.md",
        block:
          "| [`codeql.yaml`](../../.github/workflows/codeql.yaml) | GitHub Advanced Security。public は無料、private は課金 |\n",
      },
      {
        file: ".github/workflows/README.md",
        block: "| code scanning へ送る | `codeql` / `sonarcloud` | 同上 |\n",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        block: "| **Sent to code scanning** | CodeQL / SonarQube Cloud | Same as above |\n",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        block: "| **code scanning へ送る** | CodeQL / SonarQube Cloud | 同上 |\n",
      },
    ],
    docFragments: [
      {
        file: "docs/adr/0110-security-operations.md",
        fragment: ", CodeQL, Opengrep)",
        replacement: ", Opengrep)",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        fragment: "・CodeQL・Opengrep)",
        replacement: "・Opengrep)",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        fragment: "the same question as the two above",
        replacement: "the same question as above",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        fragment: "上の 2 つと同じ問いに",
        replacement: "上と同じ問いに",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        fragment: "continue to be borne by Opengrep / CodeQL",
        replacement: "continue to be borne by Opengrep",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        fragment: "Opengrep / CodeQL が引き続き担う",
        replacement: "Opengrep が引き続き担う",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        fragment:
          "Opengrep and CodeQL only open languages they can parse, so weak cipher names and hard-coded credentials in **files neither opens**",
        replacement:
          "Opengrep only opens languages it can parse, so weak cipher names and hard-coded credentials in **files it does not open**",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        fragment:
          "Opengrep も CodeQL も自分が構文解析できる言語しか開かないので、**どちらも開かないファイル**",
        replacement:
          "Opengrep は自分が構文解析できる言語しか開かないので、**それが開かないファイル**",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        fragment: "Trivy / CodeQL merge blocking",
        replacement: "Trivy merge blocking",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        fragment: "Trivy / CodeQL のマージブロック",
        replacement: "Trivy のマージブロック",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        fragment: "/ CodeQL and gitleaks fail-closed)",
        replacement: "/ gitleaks fail-closed)",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        fragment: "/ CodeQL・gitleaks は fail-closed)",
        replacement: "/ gitleaks は fail-closed)",
      },
      {
        file: "docs/adr/0110-security-operations.md",
        fragment:
          "- ❌ Not making gitleaks / CodeQL detections fail-closed (secrets and SAST high always block)",
        replacement: "- ❌ Not making gitleaks detections fail-closed (secrets always block)",
      },
      {
        file: "docs/adr/0110-security-operations.ja.md",
        fragment:
          "- ❌ gitleaks / CodeQL の検出を fail-closed にしないこと(秘密・SAST high は必ずブロック)",
        replacement: "- ❌ gitleaks の検出を fail-closed にしないこと(秘密は必ずブロック)",
      },
      {
        file: ".github/workflows/README.md",
        fragment:
          "**この層の鮮度は CodeQL が補っている**（GitHub 側が更新し続ける）ため、SAST 全体が固まるわけではない。",
        replacement: "この層だけで鮮度は保てないので、規則の更新は上流の fork の動きに従う。",
      },
      {
        file: "docs/adr/README.md",
        fragment: "two-stage Trivy / CodeQL / image-scan",
        replacement: "two-stage Trivy / Opengrep / image-scan",
      },
      {
        file: "docs/adr/README.ja.md",
        fragment: "Trivy 二段 / CodeQL / image-scan",
        replacement: "Trivy 二段 / Opengrep / image-scan",
      },
      {
        file: "docs/adr/0153-ci-configuration.md",
        fragment: "the Security group (CodeQL / Trivy",
        replacement: "the Security group (Opengrep / Trivy",
      },
      {
        file: "docs/adr/0153-ci-configuration.ja.md",
        fragment: "Security グループ(CodeQL / Trivy",
        replacement: "Security グループ(Opengrep / Trivy",
      },
      // boilerplate-only:begin
      // 剥がし（`scripts/setup/remove-boilerplate-only/`）が BACKLOG ごと消すので、宣言も一緒に消える。
      {
        file: "docs/adr/BACKLOG.md",
        fragment: "Trivy 二段・CodeQL js-ts /",
        replacement: "Trivy 二段・Opengrep /",
      },
      {
        file: "docs/adr/BACKLOG.md",
        fragment: "CI 側は `codeql` / `gitleaks`",
        replacement: "CI 側は `gitleaks`",
      },
      // boilerplate-only:end
    ],
    docSections: [],
    docMentions: DOCS,
    mentionPatterns: ["CodeQL", "codeql"],
  },
];
