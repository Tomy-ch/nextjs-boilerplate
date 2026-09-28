// 塞いだコマンドが、宣言の前方一致では届かない位置に現れていないかを判定する。
//
// **塞ぐ対象を自分で持たない。**`.claude/settings.json` の `permissions.deny` から導出する。宣言を
// 2 か所に置くと、片方だけを直した日に「deny にあるのに通る」が生まれる。
//
// 前方一致が届かないのは 3 つで、いずれもここが埋める。
//
// - **位置** —— `Bash(make tag-patch *)` は `pnpm build && make tag-patch` に当たらない
// - **引数なし** —— 同じ宣言は素の `make tag-patch` にも当たらない。しかも危険な target ほど
//   引数なしが通常の呼び方である
// - **包み** —— `bash -c` / `sudo` / `env` / `FOO=bar` / `ssh` / `make ai-` などは中身を実行するので、
//   包みを剥がして判定する
//
// 読むのはシェルの文法だけである。`python -c` / `node -e` の引数はその言語の文字列で、そこから
// シェルを呼ぶかどうかは形から分からない。迂回を禁じるのは AGENTS.md の規則であって、ここではない。

/**
 * 区切りの直後はコマンド位置になる。単体の `(` だけは散文に多すぎるので採らない。
 *
 * @remarks
 * 単独の `&` も区切りである（`cmd1 & cmd2` は cmd1 を背後へ回して cmd2 を続ける）。`&&` と
 * 二重に当たらないよう前後を見る。backtick とプロセス置換 `<(` / `>(` も、`$(` と同じく
 * **直後がコマンド位置**になる —— `$(` だけを塞ぐと同じ概念の別綴りが素通りする。
 */
const SEPARATOR = /(?:\|\||&&|(?<!&)&(?!&)|[;|\n`]|\$\(|[<>]\()/g;

/** 束ねられた短 flag（`-rf`）。長 flag と、`-` 単体は含まない。 */
const SHORT_FLAG = /^-[^-\s]+$/;

/**
 * heredoc の本体。散文をコマンド行で書くので、ここを見ると文書の中身で誤爆する。
 *
 * @remarks
 * 本体は `[^]` の否定でなく行単位で数える。`[\s\S]*?` と行頭固定の組み合わせは、閉じ綴りが
 * 現れない入力で後戻りが指数的に増える。
 */
const HEREDOC_BODY = /<<-?[ \t]*(["']?)([A-Za-z_]\w*)\1\n(?:(?!\2$)[^\n]*\n)*\2$/gm;

/** 環境変数の代入 1 語。値は引用や打ち消しを含んでよく、`FOO="a b"` も 1 語として読む。 */
const ASSIGNMENT = String.raw`[A-Za-z_]\w*=(?:'[^']*'|"(?:[^"\\]|\\[\s\S])*"|\\[\s\S]|[^\s'"\\])*`;

/** `env` の、実行するコマンドの手前に立つ flag と環境変数の代入。`-S` は含まない。 */
const ENV_OPTIONS = String.raw`(?:(?:-[A-Za-z]*[uC](?:\s+|(?=[^A-Za-z\s]))\S+|--(?:unset|chdir)\s+\S+|-(?![A-Za-z]*S|[A-Za-z]*[uC]\s)[A-Za-z]+|--(?!split-string|(?:unset|chdir)\s)[\w-]+(?:=\S+)?|${ASSIGNMENT})\s+)*`;

/** `env -S` / `--split-string` の、渡した文字列の手前まで。文字列は語に割られてコマンド行になる。 */
const ENV_SPLIT = String.raw`^env\s+${ENV_OPTIONS}(?:-[A-Za-z]*S\s*|--split-string(?:=|\s+))`;

/** `sudo` の、値を取る長 flag。値を消費しないと、値の方がコマンドとして残る。 */
const SUDO_VALUED_LONG =
  "user|group|host|prompt|role|type|close-from|chdir|chroot|other-user|command-timeout|login-class";

/** 中身をそのまま実行する包みと、剥がしたあとに残す綴り。 */
const WRAPPERS: readonly (readonly [RegExp, string])[] = [
  // quiet.mk の `ai-%` は `make <target>` を回す入口なので、target 名だけを残す。
  [/^make\s+ai-/, "make "],
  [/^rtk\s+(?:run|summary|smart)\s+/, ""],
  [new RegExp(String.raw`^(?:${ASSIGNMENT}\s+)+`), ""],
  [/^(?:nohup|time)\s+(?:--\s+)?/, ""],
  [new RegExp(String.raw`${ENV_SPLIT}(["'])([\s\S]*?)\1`), "$2"],
  [new RegExp(ENV_SPLIT), ""],
  [new RegExp(String.raw`^env\s+${ENV_OPTIONS}(?:--\s+)?`), ""],
  [/^setsid\s+(?:(?:-[A-Za-z]+|--[\w-]+)\s+)*(?:--\s+)?/, ""],
  [
    /^chroot\s+(?:(?:--(?:userspec|groups)\s+\S+|--(?!(?:userspec|groups)\s)[\w-]+(?:=\S+)?)\s+)*(?:--\s+)?\S+\s+/,
    "",
  ],
  [
    /^ionice\s+(?:(?:-[A-OQ-Zabd-moq-tv-z]*[cnpPu]\s*\S+|--(?:class|classdata|pid|pgid|uid)\s+\S+|-[A-OQ-Zabd-moq-tv-z]+|--(?!(?:class|classdata|pid|pgid|uid)\s)[\w-]+(?:=\S+)?)\s+)*(?:--\s+)?/,
    "",
  ],
  [
    /^stdbuf\s+(?:(?:-[ioe]\s*\S+|--(?:input|output|error)\s+\S+|--(?!(?:input|output|error)\s)[\w-]+(?:=\S+)?)\s+)*(?:--\s+)?/,
    "",
  ],
  [
    /^runuser\s+(?:(?:-[gG]\s+\S+|--(?:group|supp-group)(?:=|\s+)\S+|-(?![gG]\s|u)[A-Za-z]+|--(?!(?:group|supp-group|user)\b)[\w-]+(?:=\S+)?)\s+)*(?:-u\s*\S+|--user(?:=|\s+)\S+)\s+(?:--\s+)?(?![\s-])/,
    "",
  ],
  [/^nice\s+(?:(?:-n\s*\S+|--adjustment=\S+|-\d+)\s+)?/, ""],
  [
    /^timeout\s+(?:(?:-[sk]\s*\S+|--(?:signal|kill-after)\s+\S+|--[\w-]+(?:=\S+)?|-[A-Za-z]+)\s+)*\S+\s+/,
    "",
  ],
  [
    /^xargs\s+(?:(?:-[0-9A-DF-HJKM-OQ-Zb-ce-mo-rt-z]*[EILPadns]\s*\S+|--(?:arg-file|delimiter|max-args|max-procs|max-chars|process-slot-var)(?:=|\s+)\S+|-[0-9A-DF-HJKM-OQ-Zb-ce-mo-rt-z]+|--(?!(?:arg-file|delimiter|max-args|max-procs|max-chars|process-slot-var)(?:=|\s))[\w-]+(?:=\S+)?)\s+)*/,
    "",
  ],
  [
    new RegExp(
      String.raw`^(?:sudo|doas)\s+(?:(?:-[A-Za-z]*[CDRTUghprtu]\s*\S+|--(?:${SUDO_VALUED_LONG})(?:=|\s+)\S+|-[A-Za-z]+|--(?!(?:${SUDO_VALUED_LONG})(?:=|\s))[\w-]+(?:=\S+)?|${ASSIGNMENT})\s+)*(?:--\s+)?`,
    ),
    "",
  ],
];

/** シェルの名前。`/bin/bash` のようにパスで呼んでも、`busybox sh` のように束ねた入口から呼んでも同じ。 */
const SHELL = String.raw`(?:(?:\/[\w.-]+)*\/)?(?:(?:ba|da|k|mk|z|a|c|tc)?sh|fish|busybox\s+(?:a|hu)?sh)`;

/**
 * `-c` の手前に立ちうる flag（`-l` / `-o pipefail` / `-O extglob` / `--norc` / `--rcfile <file>`）と、
 * `-c` を含む束（`-lc` / `-ec`）、または fish の `--command`。
 */
const SHELL_COMMAND_FLAG = String.raw`(?:(?:[-+][A-Za-z]*[oO]\s+\S+|--(?:rcfile|init-file)\s+\S+|[-+](?![A-Za-z]*[oO]\s)[A-Za-z]+|--(?!(?:rcfile|init-file)\s)[\w-]+(?:=\S+)?)\s+)*?(?:-[A-Za-z]*c[A-Za-z]*\s+|--command(?:=|\s+))`;

/** `sh -c <引用>` は引用の中身がそのままコマンド行なので、引用を落とす前に剥がす。 */
const SHELL_C = new RegExp(
  String.raw`^(?:${SHELL}\s+(?:${SHELL_COMMAND_FLAG})?|eval\s+)(["'])([\s\S]*?)\1`,
);

/** `su -c` / `runuser -c` の、引用の手前まで。利用者名や `-l` が `-c` の前後どちらにも立つ。 */
const SWITCH_USER_COMMAND = String.raw`(?:su|runuser)\s+(?:\S+\s+)*?(?:-[A-Za-z]*c|--(?:session-)?command)(?:=|\s+)`;

/**
 * 区間の途中に立つ、引用を 1 つのコマンド行として実行させる呼び出しと、その直後の引用の開き。
 *
 * @remarks
 * `xargs sh -c '…'` や `find … -exec sh -c '…'` の引用も中身がコマンド行として実行されるが、
 * 区間の先頭ではないので `SHELL_C` では剥がれない。`su -c` / `runuser -c` も、渡した引用を
 * 相手の利用者のシェルが `-c` で実行する。
 */
const INTERPRETER_PAYLOAD = new RegExp(
  String.raw`(?:^|\s)(?:${SHELL}\s+${SHELL_COMMAND_FLAG}|eval\s+|${SWITCH_USER_COMMAND})(["'])`,
  "g",
);

/**
 * 残りの引数を空白で繋ぎ、相手側のシェルがコマンド行として読み直す呼び出しの、残りの手前まで。
 *
 * @remarks
 * `ssh <host> …` は遠隔のシェルへ、`watch …` は `sh -c` へ、引数を繋いだ 1 行を渡す。引用は
 * こちらのシェルが 1 層外してから渡すので、`ssh host 'a; b'` の `;` も向こうでは区切りになる。
 * ssh の flag は引数を取るものと取らないもので分けないと、`-p 22` の `22` をホストと読み違える。
 */
const REMOTE_COMMAND: readonly RegExp[] = [
  /(?:^|\s)ssh\s+(?:(?:-[46AaCfGgKkMNnqsTtVvXxYy]*[BDEFIJLORSWbceilmopw]\s*\S+|-[46AaCfGgKkMNnqsTtVvXxYy]+)\s+)*[^\s-]\S*\s+/,
  /(?:^|\s)watch\s+(?:(?:-[A-Za-mo-pr-z]*[nq]\s*\S+|--interval[=\s]\S+|-[A-Za-mo-pr-z]+|--(?!interval[=\s])[\w-]+(?:=\S+)?)\s+)*/,
];

/**
 * シェルが 1 層で外す引用の単位。単引用、二重引用、打ち消した 1 文字、対にならない引用符。
 *
 * @remarks
 * 対にならない引用符は落とす。中身を散文として残すと、閉じない引用の後ろのコマンドが見えなくなる。
 */
const QUOTING = /'([^']*)'|"((?:[^"\\]|\\[\s\S])*)"|\\([\s\S])|["']/g;

/** 二重引用の中でバックスラッシュが打ち消す文字。それ以外の前ではバックスラッシュが残る。 */
const DOUBLE_QUOTE_ESCAPE = /\\([$`"\\\n])/g;

/** 引用の中身を塗る文字。区切りにも空白にも引用符にも当たらない。 */
const FILL = "_";

/** 宣言とコマンド行を、同じ形（先頭の語 + 求める flag）へ割った結果。 */
export type CommandShape = {
  /** flag が現れる前までの語。`git switch -f` なら `git switch`。 */
  readonly head: string;
  /** 束ねを解いた短 flag の文字。`-rf` と `-r -f` と `-rvf` が同じ集合になる。 */
  readonly shortFlags: ReadonlySet<string>;
  /** 長 flag。綴りが意味を持つので、集合へ崩さず前方一致で照合する。 */
  readonly longFlags: readonly string[];
};

/**
 * `permissions.deny` の宣言の一覧を、設定の中身から取り出す。
 *
 * @remarks
 * **ここが返す配列が、塞ぐ対象の母集合そのものです。** キーの綴りを 1 文字間違えても型検査は
 * `unknown` 経由で通り、例外も出ず、黙って空が返ります —— そうなると `judge` がどれだけ正しくても
 * 何も塞ぎません。入口へ置くと検査の母数から外れるので、判定はここに置きます
 * （[README](../README.md)）。
 *
 * @param settings - `.claude/settings.json` を読んだもの
 */
export function extractDenyEntries(settings: unknown): readonly string[] {
  const entries = (settings as { permissions?: { deny?: unknown } })?.permissions?.deny;
  if (!Array.isArray(entries)) return [];

  return entries.filter((entry): entry is string => typeof entry === "string");
}

/**
 * PreToolUse のペイロードから、これから走るコマンド行を取り出す。
 *
 * @remarks
 * **取り出せなければ空を返し、呼び出し側が通します。** ペイロードの形が変わったときに止めると、
 * あらゆる Bash が止まります。ただし空を返すことは「塞ぐ対象が無い」ではなく「分からない」なので、
 * ここが黙って空を返し続ける壊れ方を検査で殺しておきます。
 *
 * @param raw - フックが標準入力へ渡してきた JSON
 */
export function readCommandLine(raw: string): string {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return "";
  }

  const command = (payload as { tool_input?: { command?: unknown } })?.tool_input?.command;
  return typeof command === "string" ? command : "";
}

/** 1 つの deny 宣言から取り出した、照合に要るものすべて。 */
export type Literal = {
  /** 宣言の綴り。報告にそのまま出る。 */
  readonly source: string;
  /** コマンド位置で前方一致させる先頭部分。 */
  readonly head: string;
  /**
   * 先頭部分の後ろに、この順で現れることを求める断片。
   *
   * @remarks
   * `Bash(gh api *DELETE*)` のように `*` が途中にもある宣言は、**先頭だけを見ると `gh api` を
   * まるごと塞ぎます**。`allow` が `Bash(gh api *)` を許している以上それは誤拒否で、誤爆した拒否は
   * 迂回の動機になります。断片を全部求めることで、宣言が塞ぐつもりだったものだけが当たります。
   */
  readonly fragments: readonly string[];
  /**
   * 直後に区切りを求めず、そのまま前方一致させるか。
   *
   * @remarks
   * `Bash(git switch release/*)` の `*` は語の途中に立つので、綴りは `git switch release/` で
   * 終わり、**直後には必ず語の続きが来ます**。ここで区切りを求めると `git switch release/v1.0.0` が
   * 一度も当たりません。`Bash(make tag-patch *)` のように `*` の前が空白のものは、逆に区切りを
   * 求めないと `make tag-patch-dry` まで巻き込みます。
   */
  readonly openEnded: boolean;
};

/**
 * `permissions.deny` の宣言から、コマンド位置で照合するものを取り出す。
 *
 * @remarks
 * `Bash(...)` 以外（`Edit(...)` など）は Bash の判定に関係しないので落とします。
 */
export function deriveLiterals(denyEntries: readonly string[]): readonly Literal[] {
  const PREFIX = "Bash(";
  const seen = new Map<string, Literal>();

  for (const entry of denyEntries) {
    // 綴りを取るのに添字を使わない。`matched[1] ?? ""` の右側は到達しない分岐で、
    // 「起きないこと」を検査で示せないまま母数に残る。
    if (!entry.startsWith(PREFIX) || !entry.endsWith(")")) continue;

    const body = entry.slice(PREFIX.length, -1);
    const starAt = body.indexOf("*");
    const beforeStar = starAt < 0 ? body : body.slice(0, starAt);
    const head = beforeStar.trim();
    if (!head) continue;

    const fragments =
      starAt < 0
        ? []
        : body
            .slice(starAt + 1)
            .split("*")
            .map((fragment) => fragment.trim())
            .filter(Boolean);

    seen.set(`${head}\u0000${fragments.join("\u0000")}`, {
      source: head,
      head,
      fragments,
      openEnded: !/\s$/.test(beforeStar),
    });
  }

  return [...seen.values()].sort((a, b) => a.head.localeCompare(b.head));
}

/**
 * コマンド行を「先頭の語」と「flag」へ割る。
 *
 * @remarks
 * flag を綴りのまま照合すると、順番と束ね方の数だけ宣言が要ります（`rm -rf` と `rm -fr` を別々に
 * 書く形）。短 flag を文字の集合として見れば 1 つの宣言で済みますが、**大文字小文字は区別します** ——
 * `git branch` の `-d` と `-D` のように、同じ語で危険度の違う操作が在るためです。
 */
export function parseShape(text: string): CommandShape {
  const head: string[] = [];
  const shortFlags = new Set<string>();
  const longFlags: string[] = [];

  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (token.startsWith("--")) {
      longFlags.push(token);
    } else if (SHORT_FLAG.test(token)) {
      for (const character of token.slice(1)) shortFlags.add(character);
    } else if (longFlags.length === 0 && shortFlags.size === 0) {
      head.push(token);
    }
  }

  return { head: head.join(" "), shortFlags, longFlags };
}

/**
 * 包みを剥がす。重なっていても中身へ届くよう、変わらなくなるまで繰り返す。
 *
 * @remarks
 * 危ないのは包み自身ではなく包まれた側なので、包みを丸ごと塞ぐと使える用途まで巻き添えになり
 * （`rtk run pnpm build`）、剥がさないと迂回路になります（`rtk run rm -rf /`）。
 */
export function unwrap(segment: string): string {
  return unwrapStages(segment).unwrapped;
}

/**
 * 包みを 1 枚剥がすたびの綴りを、剥がす前から順に返す。
 *
 * @remarks
 * 1 回の走査で複数の包みが剥がれるので、最後の綴りだけを見ると途中に立った包みが検査から落ちる
 * （`FOO=1 sudo ls` の `sudo ls`）。
 *
 * @param segment - 区切りで割った 1 区間
 * @returns 剥がす前の綴りを先頭に剥がした順で並べた綴りと、剥がし終えた綴り
 */
function unwrapStages(segment: string): {
  readonly stages: readonly string[];
  readonly unwrapped: string;
} {
  let current = segment.trim();
  const stages = [current];

  for (let depth = 0; depth < 8; depth++) {
    const before = current;
    for (const [pattern, replacement] of WRAPPERS) {
      const next = current.replace(pattern, replacement);
      if (next !== current) stages.push(next);
      current = next;
    }
    const next = current.replace(SHELL_C, "$2").trim();
    if (next !== current) stages.push(next);
    current = next;
    if (current === before) return { stages, unwrapped: current };
  }

  return { stages, unwrapped: current };
}

/**
 * 引用と heredoc の本体を落とす。
 *
 * @remarks
 * このリポジトリはコマンド行で文書を書くので（heredoc の中の散文、`echo` の引数）、引用の中まで
 * 見ると文書に危険なコマンド名を書いた瞬間に誤って止まります。
 */
export function stripQuoted(commandLine: string): string {
  return stripQuotes(stripHeredoc(commandLine));
}

/**
 * heredoc の本体だけを落とす。
 *
 * @remarks
 * 本体は改行をまたぐので、**区切りで割る前に**落とします。割ったあとでは `\n` が既に境界に
 * なっていて、散文の 1 行 1 行がコマンド行として現れます。
 */
function stripHeredoc(commandLine: string): string {
  return commandLine.replace(HEREDOC_BODY, " ");
}

/**
 * 引用の中身だけを落とす。
 *
 * @remarks
 * **包みを剥がしたあとの 1 区間に対して掛けます。** `sh -c "..."` の引用は散文ではなくコマンド行
 * そのものなので、剥がす前に掛けると中身ごと消えます。
 */
function stripQuotes(segment: string): string {
  return segment.replace(/'[^']*'/g, " ").replace(/"(?:[^"\\]|\\.)*"/g, " ");
}

/**
 * 引用を開閉する文字か。
 *
 * @param character - 1 文字
 * @returns 単引用符か二重引用符なら true
 */
function isQuoteCharacter(character: string): character is "'" | '"' {
  return character === "'" || character === '"';
}

/**
 * その位置でコマンド置換（backtick か `$(`）が始まるか。
 *
 * @param line - コマンド行
 * @param at - 調べる位置
 * @returns コマンド置換が始まるなら true
 */
function opensCommandSubstitution(line: string, at: number): boolean {
  return line.charAt(at) === "`" || line.startsWith("$(", at);
}

/**
 * 引用の中身と、バックスラッシュで打ち消した文字を塗り潰した写しを返す。長さと、引用を開閉する
 * 文字の位置は元のまま保つ。
 *
 * @remarks
 * 区切りを引用の外でだけ探すための写しです。**散文だと言い切れないものは塗りません** —— 閉じない
 * 引用、`$'…'`、二重引用の中のコマンド置換（`$(` / backtick）のどれかに出会ったら `undefined` を
 * 返し、呼び出し側は引用を見ずに割ります。二重引用の中のコマンド置換は実行されるうえ、その中に
 * また引用が立つので、閉じる位置を読み違えると後ろに続くコマンドを塗り潰して見逃します。
 *
 * @param line - コマンド行
 * @returns 塗った写し。塗ってよいと言い切れなければ `undefined`
 */
function maskQuoted(line: string): string | undefined {
  let out = "";
  let quote: "'" | '"' | undefined;

  for (let at = 0; at < line.length; at = out.length) {
    const character = line.charAt(at);

    if (character === "\\" && quote !== "'") {
      out += FILL.repeat(Math.min(2, line.length - at));
    } else if (quote === undefined) {
      if (character === "'" && line.charAt(at - 1) === "$") return undefined;
      if (isQuoteCharacter(character)) quote = character;
      out += character;
    } else if (character === quote) {
      quote = undefined;
      out += character;
    } else if (quote === '"' && opensCommandSubstitution(line, at)) {
      return undefined;
    } else {
      out += FILL;
    }
  }

  return quote === undefined ? out : undefined;
}

/**
 * コマンド行を、引用の外に立つ区切りで割る。
 *
 * @remarks
 * 引用の中の `|` や `;` は散文やパターンの一部であり、区切りではありません。割ってから引用を
 * 落とすと、`grep -E 'a|rm -rf'` の `rm -rf` がコマンド位置に立って見えます。引用を読み切れない
 * 行は、見逃すより止めすぎる側へ倒して引用ごと割ります。
 *
 * @param line - コマンド行
 * @returns 区切りで割った区間
 */
function splitOutsideQuotes(line: string): readonly string[] {
  const masked = maskQuoted(line);
  if (masked === undefined) return line.split(SEPARATOR);

  const pieces: string[] = [];
  let start = 0;
  for (const match of masked.matchAll(SEPARATOR)) {
    pieces.push(line.slice(start, match.index));
    start = match.index + match[0].length;
  }
  pieces.push(line.slice(start));

  return pieces;
}

/**
 * 区間の途中に立つ `sh -c` / `eval` / `su -c` / `runuser -c` へ渡した引用の中身を取り出す。
 *
 * @param segment - 区切りで割った 1 区間
 * @returns 実行されるコマンド行として読む引用の中身
 */
function interpreterPayloads(segment: string): readonly string[] {
  const masked = maskQuoted(segment);
  if (masked === undefined) return [];

  const payloads: string[] = [];
  for (const match of masked.matchAll(INTERPRETER_PAYLOAD)) {
    const open = match.index + match[0].length - 1;
    const close = masked.indexOf(masked.charAt(open), open + 1);
    payloads.push(segment.slice(open + 1, close));
  }

  return payloads;
}

/**
 * こちらのシェルが引用を 1 層外したあとの綴りを返す。
 *
 * @remarks
 * 相手側のシェルが読み直す行は、こちらで引用を外した結果である。二重引用の中のバックスラッシュは
 * `DOUBLE_QUOTE_ESCAPE` の文字の前でだけ消え、ほかの文字の前では残る —— 残った `\;` は向こうでも
 * 打ち消されたままで、区切りにならない。
 *
 * @param text - 引用を含む引数の並び
 * @returns 引用を 1 層外した綴り
 */
function dequote(text: string): string {
  return text.replace(
    QUOTING,
    (_quoted: string, single?: string, double?: string, escaped?: string) =>
      single ?? double?.replace(DOUBLE_QUOTE_ESCAPE, "$1") ?? escaped ?? "",
  );
}

/**
 * 区間の中で `ssh` / `watch` へ渡した残りの引数を、相手側が読み直すコマンド行として取り出す。
 *
 * @remarks
 * 引用を読み切れない区間でも位置は元の綴りで探す。区切りは呼び出し側が既に引用ごと割っており、
 * ここで諦めると、残りの引数だけが検査から落ちる。
 *
 * @param segment - 区切りで割った 1 区間
 * @returns 相手側のシェルが実行するコマンド行
 */
function remoteCommandLines(segment: string): readonly string[] {
  const masked = maskQuoted(segment) ?? segment;

  return REMOTE_COMMAND.flatMap((pattern) => {
    const matched = pattern.exec(masked);
    return matched ? [dequote(segment.slice(matched.index + matched[0].length))] : [];
  });
}

/** 包みを剥がすたびに中身がまたコマンド行になるので、その深さの上限。 */
const NEST_LIMIT = 4;

/** 剥がし切れなかったときに返す綴り。塞いだ操作の名前ではないので、報告でそれと分かる形にする。 */
export const UNDECIDABLE = "(包みが深すぎて判定できません)";

/**
 * コマンド行を、コマンド位置に立つ区間の一覧へ割る。
 *
 * @remarks
 * 順序が要です。**引用の外の区切りで割り、区間ごとに包みを剥がし、剥がせたものは中身をもう一度
 * 割ります。** 包みの中身はコマンド行なので、そこにも区切りが在ります。区間の途中に立つ `sh -c` /
 * `eval` / `su -c` の引用と、`ssh` / `watch` の残りの引数も同じく中身を割ります。引用を落とすのは
 * そのあとの区間に対してだけで、`sh -c "..."` の引用を散文として消してしまわないようにしています。
 *
 * @param line - コマンド行
 * @param depth - 包みを剥がした深さ
 * @returns コマンド位置に立つ区間。剥がし切れなければ `undefined`
 */
function splitSegments(line: string, depth: number): readonly string[] | undefined {
  // **剥がし切れなかったら空へ倒さない。** 落とすと「塞ぐ対象が無い」と読めるが、実際は
  // 「判定できなかった」であり、深く包むだけでガードを抜けられることになる。
  if (depth > NEST_LIMIT) return undefined;

  const out: string[] = [];
  for (const raw of splitOutsideQuotes(line)) {
    const trimmed = raw.replace(/^[\s&]+/, "").trim();
    if (!trimmed) continue;

    const { stages, unwrapped } = unwrapStages(trimmed);
    const nested =
      unwrapped !== trimmed
        ? [unwrapped]
        : [...interpreterPayloads(trimmed), ...remoteCommandLines(trimmed)];
    for (const commandLine of nested) {
      const inner = splitSegments(commandLine, depth + 1);
      if (inner === undefined) return undefined;
      out.push(...inner);
    }
    // 包み自身も 1 つのコマンドである。剥がした側だけを見ると、`sudo` のように包みの綴りそのものを
    // 塞いだ宣言が区切りの後ろや別の包みの内側で当たらなくなる。
    out.push(...stages.map(stripQuotes));
  }
  return out;
}

/** 断片が、この順で残りの中に全部現れるか。断片が無ければ真。 */
function containsInOrder(rest: string, fragments: readonly string[]): boolean {
  let cursor = 0;
  for (const fragment of fragments) {
    const at = rest.indexOf(fragment, cursor);
    if (at < 0) return false;
    cursor = at + fragment.length;
  }
  return true;
}

/** 綴りの直後が、語の切れ目になっているか。`>` / `<` は前に空白が要らないので含める。 */
function endsAtBoundary(rest: string): boolean {
  return rest === "" || /^[\s;&|)<>]/.test(rest);
}

/** 求める flag が、この区間の flag に揃っているか。 */
function flagsSatisfied(want: CommandShape, got: CommandShape): boolean {
  const shortOk = [...want.shortFlags].every((character) => got.shortFlags.has(character));
  const longOk = want.longFlags.every((wanted) =>
    got.longFlags.some((present) => present.startsWith(wanted)),
  );
  return shortOk && longOk;
}

/** 1 区間が 1 つの宣言に当たるか。 */
function hits(segment: string, got: CommandShape, literal: Literal, want: CommandShape): boolean {
  if (!segment.startsWith(want.head)) return false;

  const rest = segment.slice(want.head.length);
  // 語の途中で終わる綴り（`git switch release/`）は、直後に必ず続きが来るので境界を求めない。
  if (!literal.openEnded && !endsAtBoundary(rest)) return false;
  if (!containsInOrder(rest, literal.fragments)) return false;

  if (want.shortFlags.size === 0 && want.longFlags.length === 0) return true;
  return flagsSatisfied(want, got);
}

/**
 * コマンド行が、塞がれた綴りをコマンド位置に持つか。当たった綴りを返す（無ければ `undefined`）。
 *
 * @remarks
 * 直後が行末か区切りであることを求めるので、`make tag-patch-dry` は `make tag-patch` で止まりません。
 */
export function judge(commandLine: string, literals: readonly Literal[]): string | undefined {
  const shapes = literals.map((literal) => ({ literal, want: parseShape(literal.head) }));
  const segments = splitSegments(stripHeredoc(commandLine), 0);
  if (segments === undefined) return UNDECIDABLE;

  for (const segment of segments) {
    const got = parseShape(segment);
    const hit = shapes.find(({ literal, want }) => hits(segment, got, literal, want));
    if (hit) return hit.literal.source;
  }

  return undefined;
}
