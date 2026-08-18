#!/usr/bin/env node
// Patch android/app/build.gradle untuk release signing + versi dari package.json.
// Dipakai di CI (mobile-build.yml). Skip jika keystore secrets belum di-set.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const root = resolve(import.meta.dirname, "..");
const gradlePath = resolve(root, "android/app/build.gradle");

const keystoreBase64 = process.env.KEYSTORE_BASE64 || "";
const keystorePassword = process.env.KEYSTORE_PASSWORD || "";
const keystoreAlias = process.env.KEYSTORE_ALIAS || "";
const keystoreAliasPassword = process.env.KEYSTORE_ALIAS_PASSWORD || "";

if (!keystoreBase64 || !keystorePassword || !keystoreAlias) {
  console.warn("[signing] Skip: KEYSTORE_BASE64 / KEYSTORE_PASSWORD / KEYSTORE_ALIAS belum di-set di GitHub Secrets.");
  process.exit(0);
}

const keystoreFile = resolve(root, "android/app/animetube-release.keystore");
mkdirSync(dirname(keystoreFile), { recursive: true });
writeFileSync(keystoreFile, Buffer.from(keystoreBase64, "base64"));

let gradle = readFileSync(gradlePath, "utf8");

const signingBlock = `
    signingConfigs {
        release {
            storeFile file('animetube-release.keystore')
            storePassword '${keystorePassword}'
            keyAlias '${keystoreAlias}'
            keyPassword '${keystoreAliasPassword || keystorePassword}'
        }
    }
`;

if (!gradle.includes("signingConfigs {")) {
  gradle = gradle.replace("    buildTypes {", signingBlock + "\n    buildTypes {");
} else {
  console.warn("[signing] signingConfigs sudah ada, skip inject.");
}

if (!/signingConfig\s+signingConfigs\.release/.test(gradle)) {
  gradle = gradle.replace(
    /(buildTypes\s*{\s*release\s*{\s*minifyEnabled\s+false)/,
    "$1\n            signingConfig signingConfigs.release"
  );
}

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
let versionCode = 0;
if (pkg.version) {
  const [major = 0, minor = 0, patch = 0] = pkg.version.split(".").map(Number);
  versionCode = major * 10000 + minor * 100 + patch;
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
}

writeFileSync(gradlePath, gradle);
console.log(`[signing] OK: release signing diterapkan, versi ${pkg.version} (code ${versionCode}).`);