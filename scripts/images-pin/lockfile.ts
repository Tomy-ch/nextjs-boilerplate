// ロックファイル（image:tag → digest の SSOT）の読み書き。文法だけを与え、読み書きの実体は
// [pin-lockfile](../lib/pin-lockfile.ts) が持つ（Actions の SHA 側と同じ性質を守るため）。
import {
  type LockFormat,
  readLock as read,
  readLockOrEmpty as readOrEmpty,
  writeLock as write,
} from "../lib/pin-lockfile";

export const LOCK_FILE = "docker/images-pin.toml";

const FORMAT: LockFormat = {
  entryLabel: '"<image>:<tag>" = "sha256:<64hex>"',
  value: /^sha256:[0-9a-f]{64}$/,
  valueLabel: "digest が sha256 の 64 桁 16 進",
  header: [
    "# container image の pin 対象 digest（SSOT）。",
    "# make images-pin-resolve で解決し、make images-pin-apply で compose / Dockerfile へ反映する。",
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
