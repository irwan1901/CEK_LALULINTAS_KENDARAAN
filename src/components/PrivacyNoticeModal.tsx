import React from "react";
import { ShieldCheck, Lock, EyeOff, Cpu, HardDrive } from "lucide-react";

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-lg border border-amber-500/40 bg-[#0d131f] p-6 shadow-2xl text-slate-200">
        {/* Tactical CCTV header border */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400"></div>

        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-amber-400 font-bold">
              Protokol Keamanan & Perlindungan Privasi
            </div>
            <h2 className="text-lg font-bold text-white font-cctv-hud">
              Pemberitahuan Privasi Data Pengawasan (LPR)
            </h2>
          </div>
        </div>

        <div className="space-y-3.5 text-sm leading-relaxed text-slate-300 font-sans">
          <div className="flex items-start gap-3 p-3 rounded bg-slate-900/60 border border-slate-800">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Plat Nomor adalah Data Pribadi:</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Nomor registrasi kendaraan bermotor dilindungi oleh regulasi privasi. Sistem ini hanya digunakan untuk tujuan monitoring lalu lintas dan analitik yang sah.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded bg-slate-900/60 border border-slate-800">
            <Cpu className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Video Diproses Lokal di Browser:</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Seluruh stream rekaman video diproses secara real-time langsung di memori peramban (client-side) tanpa pernah mengunggah keseluruhan video ke server cloud.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded bg-slate-900/60 border border-slate-800">
            <EyeOff className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Hanya Potongan (Crop) Mini Dikirim ke API:</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Hanya potongan gambar kecil (&lt; 1 MB JPEG) dari area kendaraan yang terdeteksi dalam poligon ROI yang dikirimkan ke model vision untuk membaca karakter plat & logo merek.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded bg-slate-900/60 border border-slate-800">
            <HardDrive className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Tidak Ada Penyimpanan Permanen:</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Tidak ada database server yang menyimpan data atau foto kendaraan. Saat halaman ditutup atau tombol &quot;Hapus Data&quot; ditekan, semua data di memori otomatis hilang.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-[11px] font-mono text-slate-400">
            SYS_REF: PRIVACY_VER_2.4 [SECURE]
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors duration-150 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer font-cctv-hud"
          >
            SAYA MENGERTI & SETUJU
          </button>
        </div>
      </div>
    </div>
  );
};
