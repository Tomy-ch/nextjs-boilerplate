#!/usr/bin/env node

// 契約から生成し直す入口。判定は gen-api-plan.ts が持つ。
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname } from "node:path";

import { type GenApiIo, runGenApi } from "./gen-api-plan.js";

const NODE_IO: GenApiIo = {
  exists: (path) => existsSync(path),
  remove: (path) => {
    rmSync(path, { force: true, recursive: true });
  },
  move: (from, to) => {
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  },
  run: (command, args) => spawnSync(command, [...args], { stdio: "inherit" }).status === 0,
  warn: (message) => {
    console.error(message);
  },
};

if (!runGenApi(NODE_IO)) {
  process.exitCode = 1;
}
