#!/usr/bin/env bash
# VRT の基準画像を置くリポジトリ（以下 B）を用意し、vrt/__screenshots__ へサブモジュールとして
# 配線する。
#
# 組織では新規リポジトリの作成が権限で縛られていることがあるため、既存リポジトリの指定を先に問う。
#
# 新規作成した B にはコミットが 1 つも無く、その状態では git submodule add が失敗する。README を
# 置く初期コミットまでこのスクリプトが作る。

set -euo pipefail

readonly SUBMODULE_PATH="vrt/__screenshots__"
readonly README_TEMPLATE=".github/settings/vrt-images/readme-template.md"

WORK=""
cleanup() {
  [ -n "$WORK" ] && rm -rf "$WORK"
}
trap cleanup EXIT

main() {
  require_command gh
  require_command git
  [ -e /dev/tty ] || fail "対話が必要です。端末から実行してください。"

  gh auth status >/dev/null 2>&1 ||
    fail "gh がログインしていません。gh auth login を先に実行してください。"

  local parent
  parent="$(gh repo view --json name,owner -q '.owner.login + "/" + .name')"

  local target
  target="$(resolve_target_repository "$parent")"

  ensure_initial_commit "$target" "$parent"
  wire_submodule "$target"

  printf '\n✅ %s を %s へ配線しました。\n' "$target" "$SUBMODULE_PATH"
  printf '   .gitmodules と %s の差分をコミットしてください。\n' "$SUBMODULE_PATH"
  printf '   続けて make setup-vrt-app を実行し、撮り直しに使う GitHub App を登録してください。\n'
}

# 既存の指定があれば疎通と権限だけを確かめ、無ければ新規作成して owner/repo を stdout へ返す。
# 進捗は stderr へ出す（stdout は戻り値の通り道なので混ぜられない）。
resolve_target_repository() {
  local parent="$1"
  local parent_name="${parent#*/}"

  local existing
  existing="$(ask '既存のリポジトリへ配置しますか? 空欄なら新規作成 [<org>/<repo>]' '')"

  if [ -n "$existing" ]; then
    local permission
    permission="$(gh repo view "$existing" --json viewerPermission -q .viewerPermission 2>/dev/null)" ||
      fail "$existing を参照できません。名前と権限を確認してください。"
    case "$permission" in
      ADMIN | MAINTAIN | WRITE) ;;
      *) fail "$existing への書き込み権限がありません（現在: $permission）。" ;;
    esac
    log "既存の $existing を使います。"
    printf '%s\n' "$existing"
    return
  fi

  local name
  name="$(ask '作成するリポジトリ名' "${parent_name}-vrt-images")"

  local parent_visibility
  parent_visibility="$(gh repo view "$parent" --json visibility -q '.visibility | ascii_downcase')"
  local visibility
  visibility="$(ask '公開範囲 (public / private / internal)' "$parent_visibility")"
  case "$visibility" in
    public | private | internal) ;;
    *) fail "公開範囲は public / private / internal のいずれかです（入力: $visibility）。" ;;
  esac

  local target="${parent%/*}/${name}"
  if gh repo view "$target" >/dev/null 2>&1; then
    fail "$target は既に存在します。既存のリポジトリとして指定し直してください。"
  fi

  log "$target を作成します（$visibility）。"
  gh repo create "$target" "--${visibility}" --description "${parent} の VRT 基準画像" >/dev/null

  printf '%s\n' "$target"
}

# 空のリポジトリには submodule add が失敗するため、README を置く初期コミットを作る。
ensure_initial_commit() {
  local target="$1" parent="$2"

  if gh api "repos/${target}/commits?per_page=1" >/dev/null 2>&1; then
    log "$target には既にコミットがあります。初期化はしません。"
    return
  fi

  [ -f "$README_TEMPLATE" ] || fail "$README_TEMPLATE が見つかりません。"

  local branch
  branch="$(gh api "repos/${target}" -q .default_branch)"

  WORK="$(mktemp -d)"
  log "$target に README を置く初期コミットを作ります。"
  sed -e "s|{{REPO_NAME}}|${target#*/}|g" -e "s|{{PARENT_REPO}}|${parent}|g" \
    "$README_TEMPLATE" > "$WORK/README.md"

  git -C "$WORK" init --quiet --initial-branch "$branch"
  git -C "$WORK" add README.md
  git -C "$WORK" commit --quiet -m "Docs: 基準画像の置き場であることを README に書く"
  git -C "$WORK" remote add origin "$(clone_url "$target")"
  git -C "$WORK" push --quiet origin "HEAD:${branch}"
}

# 既に配線済みなら張り直す。記録済みのコミットは差し替え先には存在しないため、向き先だけを
# 変える set-url では checkout が解決できない。
wire_submodule() {
  local target="$1"
  local url
  url="$(clone_url "$target")"

  if [ -f .gitmodules ] &&
    git config --file .gitmodules --get "submodule.${SUBMODULE_PATH}.url" >/dev/null 2>&1; then
    log "$SUBMODULE_PATH を $url へ張り直します。"
    git submodule deinit --force --quiet -- "$SUBMODULE_PATH"
    git rm --force --quiet -- "$SUBMODULE_PATH"
    rm -rf "$(git rev-parse --git-dir)/modules/${SUBMODULE_PATH}"
  else
    log "$SUBMODULE_PATH を $url へ配線します。"
  fi

  git submodule add --force -- "$url" "$SUBMODULE_PATH"
}

clone_url() {
  printf 'https://github.com/%s.git\n' "$1"
}

# 既定値つきの 1 行入力。端末を直接読み書きするのは、make のレシピ越しでも、戻り値を
# コマンド置換で受けている最中でも対話できるようにするため。
ask() {
  local prompt="$1" default="$2" answer=""

  if [ -n "$default" ]; then
    printf '%s [%s]: ' "$prompt" "$default" > /dev/tty
  else
    printf '%s: ' "$prompt" > /dev/tty
  fi
  IFS= read -r answer < /dev/tty || true

  printf '%s\n' "${answer:-$default}"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 が PATH にありません。"
}

log() {
  printf '🔧 %s\n' "$1" >&2
}

fail() {
  printf '❌ %s\n' "$1" >&2
  exit 1
}

main "$@"
