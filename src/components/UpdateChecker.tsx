import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useReleaseCheck } from "@/hooks/use-release-check";
import { AlertCircle, Download, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function getPlatform(): "android" | "ios" | "web" {
  if (!Capacitor.isNativePlatform()) return "web";
  return Capacitor.getPlatform() === "android" ? "android" : "ios";
}

async function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    // Buka browser sistem (butuh @capacitor/browser — window.open("_system") tidak jalan tanpa plugin ini)
    await Browser.open({ url });
  } else {
    window.open(url, "_blank", "noopener");
  }
}

/**
 * Auto-update checker — notifikasi "Update tersedia" saat versi baru dirilis di GitHub.
 * - Android: buka browser sistem → unduh APK → user install (update/timpa)
 * - iOS/web: buka halaman GitHub Release
 */
export function UpdateChecker() {
  const { release } = useReleaseCheck();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismissKey = release ? `animetube-update-dismissed-v${release.version}` : null;

  // Tampilkan hanya SEKALI per versi (localStorage) & muncul setelah beberapa detik,
  // supaya tidak menghalangi layar begitu aplikasi dibuka.
  useEffect(() => {
    if (!release) return;
    if (localStorage.getItem(dismissKey!) === "1") {
      setDismissed(true);
      return;
    }
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [release, dismissKey]);

  const handleUpdate = useCallback(() => {
    if (!release) return;
    const platform = getPlatform();
    if (platform === "android" && release.downloadUrl) {
      openExternal(release.downloadUrl);
    } else {
      openExternal(release.url);
    }
  }, [release]);

  if (!release || dismissed || !visible) return null;

  const platform = getPlatform();

  return (
    <Alert className="fixed bottom-4 left-4 right-4 z-[140] md:max-w-md md:left-8 md:bottom-8 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        Update tersedia: v{release.version}
      </AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm mt-2">
        {platform === "android"
          ? "Versi baru AnimeTube sudah dirilis. Download APK untuk meng-update aplikasi."
          : "Versi baru AnimeTube sudah dirilis. Lihat release untuk mendapatkan fitur terbaru."}
      </AlertDescription>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant="default"
          onClick={handleUpdate}
          className="gap-1 bg-blue-600 hover:bg-blue-700"
        >
          {platform === "android" && release.downloadUrl ? (
            <>
              <Download className="h-4 w-4" />
              Download & Update
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              Lihat Release
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setDismissed(true);
            if (dismissKey) localStorage.setItem(dismissKey, "1");
          }}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
