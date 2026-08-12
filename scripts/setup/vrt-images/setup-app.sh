#!/usr/bin/env bash
# 撮り直しが基準画像のリポジトリへ push するための GitHub App を、このリポジトリの secret へ登録する。
#
# App の作成と鍵の生成だけは自動化できない（REST に作成の口が無く、manifest フローはブラウザの
# 承認を挟む。秘密鍵は生成時に一度しか表示されず、後から API で取れない）。ここが受け持つのは
# 「人が作った App を secret へ落とす」ところだけである。
#
# App ID は slug から公開エンドポイントで解決する。人が控えて貼り直す必要はない。
# 秘密鍵は gh の標準入力へ直接渡すため、ディスクにもシェル履歴にも残らない。

set -euo pipefail

main() {
  require_command gh
  require_command jq
  [ -e /dev/tty ] || fail "対話が必要です。端末から実行してください。"

  gh auth status >/dev/null 2>&1 ||
    fail "gh がログインしていません。gh auth login を先に実行してください。"

  local slug
  slug="$(ask 'App の slug を入力 (github.com/apps/<ここ>)' '')"
  [ -n "$slug" ] || fail "slug が空です。"

  local app
  app="$(gh api "/apps/${slug}" 2>/dev/null)" ||
    fail "App が見つかりません: ${slug}（URL の github.com/apps/ の後ろだけを入力してください）。"

  local app_id app_name
  app_id="$(printf '%s' "$app" | jq -r .id)"
  app_name="$(printf '%s' "$app" | jq -r .name)"

  printf '\n  App 名 : %s\n  App ID : %s\n\n' "$app_name" "$app_id"
  local confirm
  confirm="$(ask 'この App を登録しますか (y/N)' 'N')"
  case "$confirm" in
    y | Y | yes | YES) ;;
    *) fail "登録を中止しました。" ;;
  esac

  gh secret set VRT_APP_ID --body "$app_id"
  log 'VRT_APP_ID を登録しました。'

  printf '\n秘密鍵 (.pem の中身) を貼り付けて Ctrl+D:\n'
  gh secret set VRT_APP_PRIVATE_KEY
  log 'VRT_APP_PRIVATE_KEY を登録しました。'

  cat <<'NOTE'

✅ secret の登録が完了しました。

残りは GitHub の画面でしか行えません。
  1. App の Repository permissions を Contents: Read and write だけにする
  2. App の installation を「このリポジトリ」と「基準画像のリポジトリ」の 2 つに限定する
  3. 基準画像のリポジトリにルールセットを掛けない（App の push を自分で塞ぐことになる）
NOTE
}

# 既定値つきの 1 行入力。端末を直接読み書きするのは、make のレシピ越しでも対話できるようにするため。
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
