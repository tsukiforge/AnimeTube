import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"welcome" | "disclaimer">("welcome");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    // Check if user has already accepted disclaimer
    const hasAccepted = localStorage.getItem("disclaimer-accepted");
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleContinue = () => {
    setStep("disclaimer");
  };

  const handleAccept = () => {
    localStorage.setItem("disclaimer-accepted", "true");
    setAccepted(true);
    setIsOpen(false);
    setStep("welcome");
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep("welcome");
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-2xl">
        {step === "welcome" ? (
          <>
            <AlertDialogHeader className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-4xl font-black text-gradient">AnimeTube</div>
                <AlertDialogTitle className="text-2xl mt-4">
                  Selamat Datang di AnimeTube
                </AlertDialogTitle>
              </div>
            </AlertDialogHeader>

            <AlertDialogDescription className="space-y-4 text-sm text-foreground">
              <p>
                AnimeTube adalah <strong>agregator video anime</strong> yang menampilkan konten yang
                sudah tersedia publik di YouTube — gratis, tanpa login, dan tanpa iklan dari
                jaringan yang mencurigakan.
              </p>

              <p>
                Kami <strong>tidak meng-host atau mengunggah</strong> konten apa pun. Semua
                pemutaran video berjalan langsung dari server YouTube, dan setiap konten tetap milik
                pemiliknya masing-masing.
              </p>

              <p>
                Privasi Anda dihormati: tidak ada akun, tidak ada data yang dikirim ke server kami —
                riwayat tontonan dan pencarian disimpan <strong>hanya di perangkat Anda</strong>.
              </p>

              <div className="rounded-lg bg-card/50 border border-primary/20 p-4">
                <p className="text-xs">
                  <strong>Tips:</strong> Kami menerapkan filter <code>safeSearch: strict</code> agar
                  konten tetap ramah keluarga, meski tidak ada sistem filter yang sempurna 100%.
                  Untuk pengawasan tambahan, orang tua disarankan mengaktifkan parental control
                  bawaan perangkat atau YouTube.
                </p>
              </div>
            </AlertDialogDescription>

            <AlertDialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Keluar
              </Button>
              <Button onClick={handleContinue} className="bg-primary hover:bg-primary/90">
                Mulai Jelajah →
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">ℹ️</span>
                <AlertDialogTitle className="text-xl">Sekilas sebelum mulai</AlertDialogTitle>
              </div>
            </AlertDialogHeader>

            <AlertDialogDescription className="space-y-4 text-sm text-foreground max-h-96 overflow-y-auto">
              <p className="font-semibold text-primary">Tanggung Jawab Konten</p>
              <p>
                AnimeTube hanya menampilkan konten pihak ketiga melalui YouTube API dan berfungsi
                sebagai media agregasi — kami tidak mendukung atau bertanggung jawab atas konten
                yang diunggah pengguna di platform aslinya, dan tidak menge-endorse video atau
                channel tertentu.
              </p>

              <div className="space-y-3 rounded-lg bg-card/50 border border-primary/20 p-4">
                <p className="font-semibold text-sm">Dengan melanjutkan, Anda memahami bahwa:</p>
                <ul className="space-y-2 text-xs">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">✓</span>
                    <span>
                      AnimeTube adalah media agregasi konten, bukan penyedia atau pemilik konten.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">✓</span>
                    <span>
                      Konten yang muncul melalui fitur pencarian adalah pilihan Anda — video,
                      thumbnail, dan judul tetap milik pemilik aslinya di YouTube.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">✓</span>
                    <span>
                      Kami menyediakan filter konten ramah keluarga, namun tidak ada sistem filter
                      yang akurat 100%.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">✓</span>
                    <span>
                      Orang tua disarankan memantau aktivitas menonton dan mengaktifkan parental
                      control bawaan perangkat atau YouTube.
                    </span>
                  </li>
                </ul>
              </div>

              <p className="text-xs italic text-muted-foreground">
                AnimeTube menyediakan tools dan filter untuk mendukung pilihan tontonan yang
                bertanggung jawab — keputusan akhir selalu ada di tangan Anda.
              </p>
            </AlertDialogDescription>

            <AlertDialogFooter className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("welcome")}>
                ← Kembali
              </Button>
              <Button onClick={handleAccept} className="bg-primary hover:bg-primary/90">
                Mengerti, Lanjutkan
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
