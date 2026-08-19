#!/usr/bin/env node
// Patch izin native untuk fitur voice search (mikrofon):
//  - Android: RECORD_AUDIO + queries speech recognition service
//  - iOS: NSSpeechRecognitionUsageDescription + NSMicrophoneUsageDescription
// Dipakai di CI (mobile-build.yml) setelah `cap add` / `cap sync`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// ── Android ──────────────────────────────────────────────────────
const manifestPath = resolve(root, "android/app/src/main/AndroidManifest.xml");
if (existsSync(manifestPath)) {
  let manifest = readFileSync(manifestPath, "utf8");

  if (!manifest.includes("RECORD_AUDIO")) {
    manifest = manifest.replace(
      "</manifest>",
      `    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
    <queries>
        <intent>
            <action android:name="android.speech.RecognitionService" />
        </intent>
    </queries>
</manifest>`,
    );
  }

  writeFileSync(manifestPath, manifest);
  console.log("[permissions] OK: AndroidManifest.xml di-patch (RECORD_AUDIO + speech queries).");
} else {
  console.warn("[permissions] Skip: AndroidManifest.xml tidak ditemukan.");
}

// ── iOS ──────────────────────────────────────────────────────────
const plistPath = resolve(root, "ios/App/App/Info.plist");
if (existsSync(plistPath)) {
  let plist = readFileSync(plistPath, "utf8");

  const addKey = (key, value) => {
    if (!plist.includes(`<key>${key}</key>`)) {
      plist = plist.replace(
        "</dict>\n</plist>",
        `    <key>${key}</key>\n    <string>${value}</string>\n</dict>\n</plist>`,
      );
    }
  };

  addKey(
    "NSSpeechRecognitionUsageDescription",
    "AnimeTube menggunakan mikrofon untuk pencarian suara.",
  );
  addKey("NSMicrophoneUsageDescription", "AnimeTube menggunakan mikrofon untuk pencarian suara.");

  writeFileSync(plistPath, plist);
  console.log("[permissions] OK: Info.plist di-patch (speech + microphone usage).");
} else {
  console.warn("[permissions] Skip: Info.plist tidak ditemukan.");
}
