import React from "react";
import { AppSettings, INITIAL_BRANDS } from "../types";
import { Sliders, RotateCcw, CheckSquare, Square, Info } from "lucide-react";

interface SettingsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: AppSettings;
  onChangeSettings: (newSettings: AppSettings) => void;
  onResetSettings: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onToggle,
  settings,
  onChangeSettings,
  onResetSettings,
}) => {
  if (!isOpen) return null;

  const handleBrandToggle = (brand: string) => {
    const exists = settings.allowedBrands.includes(brand);
    let updated: string[];
    if (exists) {
      updated = settings.allowedBrands.filter((b) => b !== brand);
    } else {
      updated = [...settings.allowedBrands, brand];
    }
    onChangeSettings({ ...settings, allowedBrands: updated });
  };

  const handleSelectAllBrands = () => {
    onChangeSettings({ ...settings, allowedBrands: [...INITIAL_BRANDS] });
  };

  const handleClearAllBrands = () => {
    onChangeSettings({ ...settings, allowedBrands: [] });
  };

  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#0c121e]/95 p-4 shadow-xl backdrop-blur-md mb-4 text-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h3 className="font-cctv-hud font-bold text-white text-base tracking-wide">
            PANEL PENGATURAN PARAMETER DETEKSI
          </h3>
          <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            CONFIG_V1
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Reset ke pengaturan awal"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Default</span>
          </button>
          <button
            onClick={onToggle}
            className="px-2 py-0.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer font-mono"
          >
            Tutup [ESC]
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Kolom 1: Ambang Keyakinan & Voting */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Ambang Keyakinan Merek
              </label>
              <span className="text-sm font-bold font-mono text-amber-400">
                {(settings.brandConfidenceThreshold * 100).toFixed(0)}% ({settings.brandConfidenceThreshold.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.05"
              value={settings.brandConfidenceThreshold}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  brandConfidenceThreshold: parseFloat(e.target.value),
                })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1 leading-normal flex items-start gap-1">
              <Info className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              Merek dengan keyakinan di bawah ambang ini akan ditampilkan sebagai &quot;unknown&quot;. (Default: 0.25)
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Jumlah Voting Penguncian Merek
              </label>
              <span className="text-sm font-bold font-mono text-cyan-400">
                {settings.votingCount}x
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="10"
                value={settings.votingCount}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    votingCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                  })
                }
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm font-mono text-white text-center focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400 font-mono">bacaan konsisten</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Bila merek yang sama terdeteksi minimal sebanyak angka ini, merek terkunci dan panggilan AI merek dihentikan. (Default: 3)
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Interval Sampel Frame
              </label>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {settings.sampleIntervalSec.toFixed(1)} detik
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={settings.sampleIntervalSec}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  sampleIntervalSec: parseFloat(e.target.value),
                })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Frekuensi pengambilan snapshot kendaraan untuk diuji. Nilai 0.5s optimal untuk video lalu lintas standar.
            </p>
          </div>
        </div>

        {/* Kolom 2: Regex Validasi Plat Nomor */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Pola Regex Validasi Plat
              </label>
            </div>
            <input
              type="text"
              value={settings.plateRegexPattern}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  plateRegexPattern: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-amber-300 focus:border-amber-500 focus:outline-none"
              placeholder="^[A-Z]{1,2}\s?[0-9]{1,4}\s?[A-Z]{1,3}$"
            />
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Plat yang tidak cocok dengan pola regex ini akan diberi penanda badge kuning <span className="text-amber-400 font-mono font-bold">&quot;perlu cek&quot;</span>.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-400">Preset:</span>
              <button
                onClick={() =>
                  onChangeSettings({
                    ...settings,
                    plateRegexPattern: "^[A-Z]{1,2}\\s?[0-9]{1,4}\\s?[A-Z]{1,3}$",
                  })
                }
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                Indonesia (B 1234 ABC)
              </button>
              <button
                onClick={() =>
                  onChangeSettings({
                    ...settings,
                    plateRegexPattern: "^[A-Z0-9\\s\\-]{3,12}$",
                  })
                }
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                Universal Bebas
              </button>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="text-xs font-mono font-semibold text-slate-300 uppercase">
              Spesifikasi Pembatasan Laju (Rate Limit)
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Maks Request ke API:</span>
                <span className="font-mono text-amber-400">2 req/detik</span>
              </div>
              <div className="flex justify-between">
                <span>Ukuran Maks Crop:</span>
                <span className="font-mono text-cyan-400">&lt; 1 MB JPEG</span>
              </div>
              <div className="flex justify-between">
                <span>Deduplikasi Otomatis:</span>
                <span className="font-mono text-emerald-400">Aktif (Track Terkunci)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom 3: Filter Merek Diizinkan */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Filter Merek Diizinkan ({settings.allowedBrands.length}/{INITIAL_BRANDS.length})
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllBrands}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3 h-3" /> Semua
              </button>
              <button
                onClick={handleClearAllBrands}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-3 h-3" /> Kosongkan
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-2 bg-slate-900/80 rounded border border-slate-800 grid grid-cols-2 gap-1.5">
            {INITIAL_BRANDS.map((brand) => {
              const checked = settings.allowedBrands.includes(brand);
              return (
                <label
                  key={brand}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer select-none font-mono transition ${
                    checked
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                      : "bg-slate-800/40 text-slate-500 border border-transparent hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleBrandToggle(brand)}
                    className="accent-amber-500 w-3 h-3 rounded"
                  />
                  <span className="capitalize">{brand}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
