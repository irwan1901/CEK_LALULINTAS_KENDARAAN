import React, { useRef } from "react";
import {
  Upload,
  Play,
  Pause,
  Download,
  Trash2,
  Sliders,
  Shield,
  Video,
  Sparkles,
} from "lucide-react";

interface CctvHeaderProps {
  onUploadFile: (file: File) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onClearData: () => void;
  onToggleSettings: () => void;
  isSettingsOpen: boolean;
  onOpenPrivacy: () => void;
  isSimulatedDemo: boolean;
  onToggleDemo: () => void;
  detectionCount: number;
}

export const CctvHeader: React.FC<CctvHeaderProps> = ({
  onUploadFile,
  isPlaying,
  onTogglePlay,
  onExportCsv,
  onExportJson,
  onClearData,
  onToggleSettings,
  isSettingsOpen,
  onOpenPrivacy,
  isSimulatedDemo,
  onToggleDemo,
  detectionCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert("Ukuran file melebihi batas 100 MB. Silakan unggah video atau gambar yang lebih kecil.");
        return;
      }
      onUploadFile(file);
    }
    // reset input value so re-uploading same file triggers event
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <header className="border-b border-slate-800 bg-[#090d16] text-white select-none">
      <div className="max-w-[1700px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand / App Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-500/50 shadow-inner">
            <Video className="w-5 h-5 text-amber-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#090d16]"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-extrabold tracking-wider font-cctv-hud text-white uppercase">
                LPR-Brand <span className="text-amber-400">Vision</span>
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                SURV_AI
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              License Plate & Vehicle Brand Surveillance System
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/mp4,video/webm,image/jpeg,image/png"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer active:scale-95"
            title="Unggah Video (MP4/WebM, maks 100MB) atau Gambar (JPG/PNG)"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Unggah Video/Gambar</span>
          </button>

          {/* Start/Pause Analysis Button */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold font-cctv-hud transition cursor-pointer active:scale-95 ${
              isPlaying
                ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Jeda</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Mulai</span>
              </>
            )}
          </button>

          {/* Toggle Demo Simulation */}
          <button
            onClick={onToggleDemo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition cursor-pointer ${
              isSimulatedDemo
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="Gunakan simulasi traffic CCTV bawaan"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSimulatedDemo ? "Demo: Aktif" : "Mode Demo"}</span>
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            disabled={detectionCount === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition border ${
              detectionCount > 0
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
                : "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
            }`}
            title="Ekspor hasil deteksi ke format CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            disabled={detectionCount === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition border ${
              detectionCount > 0
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
                : "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
            }`}
            title="Ekspor hasil deteksi ke format JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ekspor JSON</span>
          </button>

          {/* Clear Data */}
          <button
            onClick={onClearData}
            disabled={detectionCount === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition border ${
              detectionCount > 0
                ? "bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60 cursor-pointer"
                : "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
            }`}
            title="Hapus semua hasil deteksi dan gambar crop dari memori"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Hapus Data</span>
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Settings button */}
          <button
            onClick={onToggleSettings}
            className={`p-1.5 rounded border transition cursor-pointer ${
              isSettingsOpen
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="Pengaturan parameter deteksi & filter merek"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Privacy info button */}
          <button
            onClick={onOpenPrivacy}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Informasi Privasi & Perlindungan Data"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
