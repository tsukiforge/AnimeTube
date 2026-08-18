import { AlertCircle, Download, ExternalLink, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useReleaseCheck } from "@/hooks/use-release-check";

function getPlatform(): "android" | "ios" | "web" {
  const cap = (window as any).Capacitor;
  if (cap?.getPlatform) {
    const p = cap.getPlatform();
    if (p === "android" || p === "ios") return p;
  }
  return "web";
}

/**
 * Auto-update checker — muncul ketika versi baru tersedia di GitHub Release.
 * - Android: buka browser sistem → unduh APK → user install (update "timpang")
 * - iOS/web: buka halaman GitHub Release
 */
export function UpdateChecker() {
  const { release } = useReleaseCheck();
  const [dismissed, setDismissed] = useState(false);

  const handleUpdate = useCallback(() => {
    if (!release) return;

    const platform = getPlatform();

    if (platform === "android" && release.downloadUrl) {
      // Buka browser sistem: unduh animetube.apk → prompt install (update/timpa)
      window.open(release.downloadUrl, "_system");
    } else {
      window.open(release.url, "_blank");
    }
  }, [release]);

  if (!release || dismissed) return null;

  const platform = getPlatform();

  return (
    <Alert className="fixed bottom-4 left-4 right-4 md:max-w-md md:bottom-8 md:right-8 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        Update tersedia: v{release.version}
      </AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm mt-2">
        {platform === "android"
          ? "Versi baru AnimeTube sudah dirilis. Download APK untuk meng-update aplikasi."
          : "Versi baru AnimeTube sudah dirilis. Update sekarang untuk mendapatkan fitur terbaru dan perbaikan bug."}
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
          onClick={() => setDismissed(true)}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
