#!/usr/bin/env bash
# 撮り直した基準画像を置き場へ送り、サブモジュールのポインタを進める。
#
# 引数はポインタを載せるブランチ名（省略時は現在のブランチ）。
#
# 一式まるごとを 1 コミットにし、親は常に置き場の根にする。撮り直しどうしを繋げると古い一式が
# 新しい一式の祖先になり、掃除でどれも落とせなくなる。根を共有させるのは、GitHub の compare が
# 無関係な履歴どうしを比較できないため。
#
# 手元と CI が同じ手順を踏むように、撮り直しの workflow もこのスクリプトを呼ぶ。
# `before=` / `after=` / `count=` を stdout へ出すので、呼び出し側はそれを読む。

set -euo pipefail

readonly STORE="vrt/__screenshots__"

main() {
  local branch="${1:-$(git rev-parse --abbrev-ref HEAD)}"

  [ -d "$STORE/.git" ] || fail "$STORE が取り込まれていません。git submodule update --init $STORE を実行してください。"

  local ref
  ref="$(pnpm exec tsx scripts/vrt-images ref "$branch")"

  local before
  before="$(git -C "$STORE" rev-parse HEAD)"

  git -C "$STORE" add --all
  if git -C "$STORE" diff --cached --quiet; then
    fail "撮り直した画像が既存と同じです。基準画像は更新していません。"
  fi

  local count
  count="$(git -C "$STORE" diff --cached --name-only | wc -l | tr -d ' ')"

  local root
  root="$(git -C "$STORE" ls-remote --symref origin HEAD |
    awk '/^ref:/ { sub("refs/heads/", "", $2); print $2 }')"
  git -C "$STORE" fetch --quiet --depth 1 origin "$root"
  git -C "$STORE" reset --soft FETCH_HEAD
  git -C "$STORE" commit --quiet -m "Test: ${branch} の基準画像を撮り直す"
  git -C "$STORE" push --quiet --force origin "HEAD:refs/heads/${ref}"

  git add "$STORE"

  printf 'before=%s\n' "$before"
  printf 'after=%s\n' "$(git -C "$STORE" rev-parse HEAD)"
  printf 'count=%s\n' "$count"
}

fail() {
  printf '❌ %s\n' "$1" >&2
  exit 1
}

main "$@"
