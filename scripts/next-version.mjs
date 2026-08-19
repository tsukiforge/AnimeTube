import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const pkgPath = "package.json";
const lockPath = "package-lock.json";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");

const pkg = readJson(pkgPath);
const current = pkg.version;

const tagExists =
  execSync(`git ls-remote --tags origin "v${current}"`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim() !== "";

let next = current;
if (tagExists) {
  const [major, minor, patch] = current.split(".").map(Number);
  next = `${major}.${minor}.${patch + 1}`;
}

if (next !== current) {
  pkg.version = next;
  writeJson(pkgPath, pkg);
  const lock = readJson(lockPath);
  lock.version = next;
  if (lock.packages?.[""]) lock.packages[""].version = next;
  writeJson(lockPath, lock);
  console.log(`next-version: ${current} -> ${next}`);
} else {
  console.log(`next-version: ${current} (tag belum ada — pakai versi saat ini)`);
}