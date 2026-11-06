import React from "react";
import { DetectionCard } from "../types";
import { AlertCircle, CheckCircle2, Lock, Clock, Car, ShieldAlert } from "lucide-react";

interface RecentDetectionsPanelProps {
  detections: DetectionCard[];
  onSelectCard?: (card: DetectionCard) => void;
  brandConfidenceThreshold: number;
}

export const RecentDetectionsPanel: React.FC<RecentDetectionsPanelProps> = ({
  detections,
  onSelectCard,
  brandConfidenceThreshold,
}) => {
  // Sort newest first, max 20 cards
  const displayCards = detections.slice(0, 20);

  const getConfidenceColorClass = (conf: number) => {
    if (conf >= 0.75) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
    if (conf >= 0.5) return "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]";
    return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]";
  };

  const getConfidenceText = (conf: number) => {
    return `${(conf * 100).toFixed(0)}%`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] rounded-lg border border-slate-800 shadow-xl overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-800 bg-[#0d1422]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
          <h2 className="text-sm font-bold tracking-wider font-cctv-hud text-white uppercase">
            Deteksi Terbaru
          </h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
          <span>{displayCards.length}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">20</span>
        </div>
      </div>

      {/* Cards Scrollable List */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-220px)] min-h-[300px]">
        {displayCards.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center animate-[spin_12s_linear_infinite]">
                <div className="w-8 h-8 rounded-full border border-amber-500/30"></div>
              </div>
              <Car className="w-6 h-6 text-slate-600 absolute inset-0 m-auto" />
            </div>
            <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wide">
              Menunggu Deteksi Kendaraan
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
              Mulai pemutaran video atau aktifkan mode demo untuk melihat pembacaan plat dan merek.
            </p>
          </div>
        ) : (
          displayCards.map((card) => {
            const isUnknownBrand =
              !card.brand ||
              card.brand === "unknown" ||
              card.brandConfidence < brandConfidenceThreshold;
            const displayBrand = isUnknownBrand ? "unknown" : card.brand.toLowerCase();

            return (
              <div
                key={card.trackId}
                onClick={() => onSelectCard?.(card)}
                className="group relative rounded-md border border-amber-500/40 bg-[#0f1728]/90 hover:bg-[#131d33] transition-all duration-150 p-2.5 shadow-md hover:border-amber-400 cursor-pointer overflow-hidden"
              >
                {/* Surveillance corner ticks */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-amber-400/80"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-amber-400/80"></div>

                <div className="flex items-start gap-2.5">
                  {/* Vehicle / Plate Crop Thumbnail */}
                  <div className="relative w-20 h-16 rounded bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {card.cropDataUrl ? (
                      <img
                        src={card.cropDataUrl}
                        alt={`Crop ${card.plate}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <Car className="w-6 h-6 text-slate-700" />
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-mono text-center text-slate-400 py-0.5 uppercase">
                      ID #{card.trackId}
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* License Plate Text */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono-plate font-bold text-sm tracking-wider text-amber-300 truncate">
                        {card.plate || "TIDAK TERDETEKSI"}
                      </span>

                      {/* Needs check badge */}
                      {card.needsPlateCheck && (
                        <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                          <AlertCircle className="w-2.5 h-2.5" />
                          perlu cek
                        </span>
                      )}
                    </div>

                    {/* Brand recognition with confidence dot */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${getConfidenceColorClass(
                            card.brandConfidence
                          )}`}
                          title={`Keyakinan Merek: ${getConfidenceText(card.brandConfidence)}`}
                        ></span>
                        <span className="font-mono lowercase text-slate-200 font-medium truncate">
                          {displayBrand}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {getConfidenceText(card.brandConfidence)}
                      </span>
                    </div>

                    {/* Meta info: timestamp, vehicle type & locked status */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {card.timestamp}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {card.vehicleType && card.vehicleType !== "unknown" && (
                          <span className="text-slate-400 uppercase text-[9px]">
                            {card.vehicleType}
                          </span>
                        )}
                        {card.isLocked ? (
                          <span
                            className="flex items-center text-cyan-400"
                            title="Merek terkunci setelah mencapai kuota voting"
                          >
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        ) : (
                          <span
                            className="text-amber-500/70 text-[9px]"
                            title="Sedang mengumpulkan sampel voting"
                          >
                            v:{card.readingCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Panel Footer */}
      <div className="px-3 py-2 border-t border-slate-800/80 bg-[#0b101c] text-[10px] font-mono text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          &ge;75%
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1.5"></span>
          50-74%
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 ml-1.5"></span>
          &lt;50%
        </span>
        <span className="text-slate-400">BINGKAI KUNING (MAX 20)</span>
      </div>
    </div>
  );
};
