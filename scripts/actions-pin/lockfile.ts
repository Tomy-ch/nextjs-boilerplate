// ロックファイル（tag → SHA の SSOT）の読み書き。文法だけを与え、読み書きの実体は
// [pin-lockfile](../lib/pin-lockfile.ts) が持つ（image digest 側と同じ性質を守るため）。
import {
  type LockFormat,
  readLock as read,
  readLockOrEmpty as readOrEmpty,
  writeLock as write,
} from "../lib/pin-lockfile";

export const LOCK_FILE = ".github/actions-pin.toml";

const FORMAT: LockFormat = {
  entryLabel: '"<owner>/<repo>@<tag>" = "<40hex>"',
  value: /^[0-9a-f]{40}$/,
  valueLabel: "SHA が 40 桁の 16 進",
  header: [
    "# GitHub Actions の pin 対象 SHA（SSOT）。",
    "# make actions-pin-resolve で解決し、make actions-pin-apply で workflow へ反映する。",
  ],
};

export function readLock(file: string): Map<string, string> {
  return read(file, FORMAT);
}

export function readLockOrEmpty(file: string): Map<string, string> {
  return readOrEmpty(file, FORMAT);
}

export function writeLock(file: string, lock: Map<string, string>): void {
  write(file, lock, FORMAT);
}
