import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AppSettings,
  BoundingBox,
  DEFAULT_SETTINGS,
  DetectionCard,
  Point,
  TrackedVehicle,
} from "./types";
import {
  aggregateBrandVoting,
  aggregatePlateVoting,
  calculateIoU,
  cropVehicleFromSource,
  exportToCSV,
  exportToJSON,
  isBBoxInPolygon,
  validatePlateRegex,
} from "./utils/tracking";
import {
  DemoSimVehicle,
  SAMPLE_DEMO_DETECTIONS,
  TrafficSimulator,
  createPlatePreviewPlaceholder,
} from "./utils/demoTrafficGenerator";
import { CctvHeader } from "./components/CctvHeader";
import { RecentDetectionsPanel } from "./components/RecentDetectionsPanel";
import { CctvVideoPlayer } from "./components/CctvVideoPlayer";
import { SettingsPanel } from "./components/SettingsPanel";
import { PrivacyNoticeModal } from "./components/PrivacyNoticeModal";
import { AlertTriangle, X, CheckCircle, Info, ExternalLink } from "lucide-react";

const INITIAL_ROI: Point[] = [
  { x: 0.12, y: 0.20 },
  { x: 0.88, y: 0.20 },
  { x: 0.98, y: 0.92 },
  { x: 0.02, y: 0.92 },
];

export default function App() {
  // Source State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSimulatedDemo, setIsSimulatedDemo] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // ROI State
  const [roiPolygon, setRoiPolygon] = useState<Point[]>(INITIAL_ROI);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("lpr_settings");
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Privacy Notice State
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(() => {
    return !localStorage.getItem("lpr_privacy_acknowledged");
  });

  // Tracking and Detections State
  const [trackedVehicles, setTrackedVehicles] = useState<TrackedVehicle[]>([]);
  const [detectionCards, setDetectionCards] = useState<DetectionCard[]>(() => {
    return [...SAMPLE_DEMO_DETECTIONS];
  });

  // System Stats
  const [processingFps, setProcessingFps] = useState(25.4);
  const [apiStatus, setApiStatus] = useState<"idle" | "analyzing" | "rate_limited" | "error">("idle");
  const [systemAlert, setSystemAlert] = useState<{ type: "error" | "info" | "success"; message: string } | null>(null);
  const [selectedCard, setSelectedCard] = useState<DetectionCard | null>(null);

  // Traffic Simulator Instance
  const simulatorRef = useRef<TrafficSimulator>(new TrafficSimulator());
  const nextTrackIdRef = useRef<number>(300);

  // Rate Limiting (max 2 req/s)
  const apiCallTimestampsRef = useRef<number[]>([]);
  const isAnalyzingQueueRef = useRef(false);

  // Save settings changes
  useEffect(() => {
    localStorage.setItem("lpr_settings", JSON.stringify(settings));
  }, [settings]);

  // Handle Privacy Notice Dismissal
  const handleClosePrivacyNotice = () => {
    setShowPrivacyNotice(false);
    localStorage.setItem("lpr_privacy_acknowledged", "true");
  };

  // Handle File Upload (Video or Image)
  const handleUploadFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      setSystemAlert({
        type: "error",
        message: "Format file tidak didukung. Harap unggah video MP4/WebM atau gambar JPG/PNG.",
      });
      return;
    }

    // Clean up previous URLs
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (imageUrl) URL.revokeObjectURL(imageUrl);

    const objUrl = URL.createObjectURL(file);
    setIsSimulatedDemo(false);

    if (isVideo) {
      setVideoUrl(objUrl);
      setImageUrl(null);
      setIsPlaying(false); // Pause so user can view first frame & set ROI
      setSystemAlert({
        type: "info",
        message: `Video "${file.name}" dimuat. Anda dapat menggambar poligon ROI atau langsung klik "Mulai".`,
      });
    } else {
      setImageUrl(objUrl);
      setVideoUrl(null);
      setIsPlaying(false);
      setSystemAlert({
        type: "info",
        message: `Gambar "${file.name}" dimuat. Klik "Mulai" untuk menganalisis frame.`,
      });
    }
  };

  // Toggle Demo Simulation
  const handleToggleDemo = () => {
    const nextState = !isSimulatedDemo;
    setIsSimulatedDemo(nextState);
    if (nextState) {
      setVideoUrl(null);
      setImageUrl(null);
      setIsPlaying(true);
      setSystemAlert({
        type: "info",
        message: "Mode Demo Simulasi CCTV diaktifkan dengan lalu lintas sintetik real-time.",
      });
    } else {
      setIsPlaying(false);
    }
  };

  // ROI Actions
  const handleResetRoi = () => {
    setRoiPolygon([]);
    setSystemAlert({
      type: "info",
      message: "Poligon ROI telah direset.",
    });
  };

  const handleSkipRoi = () => {
    setRoiPolygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
    setSystemAlert({
      type: "info",
      message: "Mode Lewati ROI aktif: seluruh frame video akan dipindai.",
    });
  };

  // Clear Data Action
  const handleClearData = () => {
    setTrackedVehicles([]);
    setDetectionCards([]);
    setSelectedCard(null);
    setSystemAlert({
      type: "success",
      message: "Seluruh data deteksi dan gambar crop telah dihapus dari memori.",
    });
  };

  // Export Actions
  const handleExportCsv = () => {
    if (detectionCards.length === 0) return;
    exportToCSV(detectionCards);
    setSystemAlert({
      type: "success",
      message: `${detectionCards.length} data deteksi berhasil diekspor ke CSV.`,
    });
  };

  const handleExportJson = () => {
    if (detectionCards.length === 0) return;
    exportToJSON(detectionCards);
    setSystemAlert({
      type: "success",
      message: `${detectionCards.length} data deteksi berhasil diekspor ke JSON.`,
    });
  };

  // Call /api/analyze with rate limiter (max 2/sec)
  const callAnalyzeApi = async (imageBase64: string): Promise<any> => {
    const now = Date.now();
    // Filter timestamps within last 1000ms
    apiCallTimestampsRef.current = apiCallTimestampsRef.current.filter((t) => now - t < 1000);

    if (apiCallTimestampsRef.current.length >= 2) {
      setApiStatus("rate_limited");
      // Wait for next slot
      const oldest = apiCallTimestampsRef.current[0];
      const waitTime = Math.max(50, 1050 - (now - oldest));
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    apiCallTimestampsRef.current.push(Date.now());
    setApiStatus("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: Gagal memproses gambar.`);
      }

      const data = await res.json();
      setApiStatus("idle");
      return data;
    } catch (err: any) {
      console.warn("Analyze API call failed:", err);
      setApiStatus("error");
      const msg = err.message || "Gagal menghubungi layanan Gemini API.";
      if (msg.includes("GEMINI_API_KEY_MISSING")) {
        setSystemAlert({
          type: "error",
          message: "Kunci GEMINI_API_KEY belum disetel di server. Pastikan menyetelnya di panel Secrets AI Studio.",
        });
      }
      throw err;
    }
  };

  // Core Processing Loop: Runs every sampleIntervalSec when isPlaying is true
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(200, Math.round(settings.sampleIntervalSec * 1000));
    let isProcessingTick = false;

    const tick = async () => {
      if (isProcessingTick) return;
      isProcessingTick = true;

      try {
        const now = Date.now();
        setProcessingFps(24 + Math.random() * 4);

        if (isSimulatedDemo) {
          // In Demo mode, simulate vehicles driving and detect them in ROI
          // Find vehicles currently in the simulator
          const simVehicles = simulatorRef.current["vehicles"] as DemoSimVehicle[] | undefined;
          if (simVehicles && simVehicles.length > 0) {
            setTrackedVehicles((prev) => {
              const updatedTracks = [...prev];

              for (const sv of simVehicles) {
                const bbox: BoundingBox = {
                  x: Math.max(0, sv.x),
                  y: Math.max(0, sv.y),
                  width: sv.width,
                  height: sv.height,
                };

                // Check if inside ROI polygon
                const inRoi = isBBoxInPolygon(bbox, roiPolygon);
                if (!inRoi) continue;

                // Match with existing track by IoU
                let matchedIndex = -1;
                let highestIoU = 0.2;

                for (let i = 0; i < updatedTracks.length; i++) {
                  const iou = calculateIoU(updatedTracks[i].bbox, bbox);
                  if (iou > highestIoU) {
                    highestIoU = iou;
                    matchedIndex = i;
                  }
                }

                if (matchedIndex >= 0) {
                  // Update position
                  updatedTracks[matchedIndex].bbox = bbox;
                  updatedTracks[matchedIndex].lastSeen = now;
                } else {
                  // Spawn new tracked vehicle
                  const newTrackId = sv.id || nextTrackIdRef.current++;
                  const crop = createPlatePreviewPlaceholder(sv.plate, sv.brand, sv.color);

                  const newTrack: TrackedVehicle = {
                    trackId: newTrackId,
                    bbox,
                    firstSeen: now,
                    lastSeen: now,
                    plateReadings: [{ plate: sv.plate, confidence: 0.94, timestamp: now }],
                    brandReadings: [{ brand: sv.brand, confidence: 0.92, timestamp: now }],
                    cropDataUrl: crop,
                    vehicleType: sv.vehicleType,
                    timestamp: new Date().toTimeString().slice(0, 8),
                    needsPlateCheck: !validatePlateRegex(sv.plate, settings.plateRegexPattern),
                    isLocked: false,
                    pendingAnalysis: false,
                    lastAnalysisTime: now,
                  };
                  updatedTracks.push(newTrack);

                  // Update/prepend to DetectionCards
                  setDetectionCards((prevCards) => {
                    const filtered = prevCards.filter((c) => c.trackId !== newTrackId);
                    const newCard: DetectionCard = {
                      trackId: newTrackId,
                      plate: sv.plate,
                      plateConfidence: 0.94,
                      brand: sv.brand,
                      brandConfidence: 0.92,
                      cropDataUrl: crop,
                      timestamp: newTrack.timestamp,
                      needsPlateCheck: newTrack.needsPlateCheck,
                      vehicleType: sv.vehicleType,
                      readingCount: 1,
                      isLocked: false,
                    };
                    return [newCard, ...filtered].slice(0, 20);
                  });
                }
              }

              // Also check vehicles in ROI that need voting updates
              for (const track of updatedTracks) {
                if (!track.isLocked && track.brandReadings.length < settings.votingCount) {
                  // Add simulated progressive reading
                  const lastBrand = track.brandReadings[0]?.brand || "unknown";
                  const lastPlate = track.plateReadings[0]?.plate || "UNKNOWN";
                  track.brandReadings.push({
                    brand: lastBrand,
                    confidence: 0.90 + Math.random() * 0.08,
                    timestamp: now,
                  });
                  track.plateReadings.push({
                    plate: lastPlate,
                    confidence: 0.92 + Math.random() * 0.06,
                    timestamp: now,
                  });

                  // Aggregate brand
                  const brandVote = aggregateBrandVoting(
                    track.brandReadings,
                    settings.votingCount,
                    settings.brandConfidenceThreshold
                  );
                  track.lockedBrand = brandVote.brand;
                  track.lockedBrandConfidence = brandVote.confidence;
                  track.isLocked = brandVote.isLocked;

                  // Update detection card in-place
                  setDetectionCards((prevCards) => {
                    return prevCards.map((c) => {
                      if (c.trackId === track.trackId) {
                        return {
                          ...c,
                          brand: brandVote.brand,
                          brandConfidence: brandVote.confidence,
                          isLocked: brandVote.isLocked,
                          readingCount: track.brandReadings.length,
                        };
                      }
                      return c;
                    });
                  });
                }
              }

              // Prune tracks unseen for > 6 seconds
              return updatedTracks.filter((t) => now - t.lastSeen < 6000);
            });
          }
        } else {
          // Real Video or Image Analysis
          // Find video or image element from DOM
          const videoEl = document.querySelector("video") as HTMLVideoElement | null;
          const imgEl = document.querySelector("img[alt='Source Frame']") as HTMLImageElement | null;
          const sourceEl = videoEl || imgEl;

          if (sourceEl) {
            // Determine candidate bounding box inside ROI
            // Default center of ROI or detected moving box
            let roiBox: BoundingBox;
            if (roiPolygon.length >= 3) {
              const xs = roiPolygon.map((p) => p.x);
              const ys = roiPolygon.map((p) => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              // Target vehicle-sized subregion inside ROI
              roiBox = {
                x: minX + (maxX - minX) * 0.15,
                y: minY + (maxY - minY) * 0.2,
                width: (maxX - minX) * 0.7,
                height: (maxY - minY) * 0.6,
              };
            } else {
              roiBox = { x: 0.2, y: 0.25, width: 0.6, height: 0.5 };
            }

            // Extract vehicle crop
            const cropBase64 = cropVehicleFromSource(sourceEl as any, roiBox);
            if (cropBase64 && cropBase64.length > 100) {
              const targetTrackId = nextTrackIdRef.current;

              // Check if we already have an active track that is locked
              const existingTrack = trackedVehicles.find((t) => t.isLocked);
              if (!existingTrack || !imageUrl) {
                try {
                  // Call backend /api/analyze
                  const aiResult = await callAnalyzeApi(cropBase64);

                  if (aiResult) {
                    const plateText = (aiResult.plate_text || "UNKNOWN").toUpperCase();
                    const plateConf = aiResult.plate_confidence || 0.8;
                    let brand = (aiResult.brand || "unknown").toLowerCase();
                    const brandConf = aiResult.brand_confidence || 0.8;
                    const vType = aiResult.vehicle_type || "car";

                    // Apply brand confidence threshold
                    if (brandConf < settings.brandConfidenceThreshold) {
                      brand = "unknown";
                    }

                    // Apply allowed brands filter
                    if (brand !== "unknown" && !settings.allowedBrands.includes(brand)) {
                      brand = "unknown";
                    }

                    const needsCheck = !validatePlateRegex(plateText, settings.plateRegexPattern);
                    const timestampStr = new Date().toTimeString().slice(0, 8);

                    // Register new tracked vehicle
                    const newTrack: TrackedVehicle = {
                      trackId: targetTrackId,
                      bbox: roiBox,
                      firstSeen: now,
                      lastSeen: now,
                      plateReadings: [{ plate: plateText, confidence: plateConf, timestamp: now }],
                      brandReadings: [{ brand, confidence: brandConf, timestamp: now }],
                      lockedBrand: brand,
                      lockedBrandConfidence: brandConf,
                      bestPlate: plateText,
                      bestPlateConfidence: plateConf,
                      cropDataUrl: cropBase64,
                      vehicleType: vType,
                      timestamp: timestampStr,
                      needsPlateCheck: needsCheck,
                      isLocked: true,
                      pendingAnalysis: false,
                      lastAnalysisTime: now,
                    };

                    nextTrackIdRef.current++;
                    setTrackedVehicles([newTrack]);

                    // Add detection card
                    setDetectionCards((prev) => {
                      const newCard: DetectionCard = {
                        trackId: targetTrackId,
                        plate: plateText,
                        plateConfidence: plateConf,
                        brand,
                        brandConfidence: brandConf,
                        cropDataUrl: cropBase64,
                        timestamp: timestampStr,
                        needsPlateCheck: needsCheck,
                        vehicleType: vType,
                        readingCount: 1,
                        isLocked: true,
                      };
                      return [newCard, ...prev.filter((c) => c.trackId !== targetTrackId)].slice(0, 20);
                    });

                    // If it was a single image, pause after processing
                    if (imageUrl) {
                      setIsPlaying(false);
                      setSystemAlert({
                        type: "success",
                        message: `Analisis gambar selesai: Plat "${plateText}" & Merek "${brand}".`,
                      });
                    }
                  }
                } catch (err: any) {
                  // Handled in callAnalyzeApi
                }
              }
            }
          }
        }
      } finally {
        isProcessingTick = false;
      }
    };

    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [
    isPlaying,
    isSimulatedDemo,
    imageUrl,
    roiPolygon,
    settings,
    trackedVehicles,
  ]);

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* CCTV Header */}
      <CctvHeader
        onUploadFile={handleUploadFile}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onClearData={handleClearData}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        isSettingsOpen={isSettingsOpen}
        onOpenPrivacy={() => setShowPrivacyNotice(true)}
        isSimulatedDemo={isSimulatedDemo}
        onToggleDemo={handleToggleDemo}
        detectionCount={detectionCards.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 md:p-4 flex flex-col gap-3">
        {/* Collapsible Settings Panel */}
        <SettingsPanel
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsOpen(false)}
          settings={settings}
          onChangeSettings={setSettings}
          onResetSettings={() => setSettings(DEFAULT_SETTINGS)}
        />

        {/* Global Notification Banner */}
        {systemAlert && (
          <div
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-mono transition shadow-lg ${
              systemAlert.type === "error"
                ? "bg-rose-950/80 border-rose-700/80 text-rose-200"
                : systemAlert.type === "success"
                ? "bg-emerald-950/80 border-emerald-700/80 text-emerald-200"
                : "bg-slate-900 border-amber-500/40 text-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {systemAlert.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : systemAlert.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{systemAlert.message}</span>
            </div>
            <button
              onClick={() => setSystemAlert(null)}
              className="p-1 hover:bg-white/10 rounded cursor-pointer text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Grid Layout: Left Panel (25%) + Center Video Player (75%) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5 flex-1 items-start">
          {/* Left Panel: Deteksi Terbaru (25% on desktop, moves below video on mobile) */}
          <div className="order-2 lg:order-1 lg:col-span-1 h-full">
            <RecentDetectionsPanel
              detections={detectionCards}
              onSelectCard={(card) => setSelectedCard(card)}
              brandConfidenceThreshold={settings.brandConfidenceThreshold}
            />
          </div>

          {/* Center Panel: Video Player & Canvas Overlay (75% on desktop) */}
          <div className="order-1 lg:order-2 lg:col-span-3 space-y-3">
            <CctvVideoPlayer
              videoUrl={videoUrl}
              imageUrl={imageUrl}
              isSimulatedDemo={isSimulatedDemo}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              roiPolygon={roiPolygon}
              onChangeRoiPolygon={setRoiPolygon}
              trackedVehicles={trackedVehicles}
              processingFps={processingFps}
              apiStatus={apiStatus}
              onSampleFrameForAnalysis={() => {}}
              onResetRoi={handleResetRoi}
              onSkipRoi={handleSkipRoi}
              simulatorInstance={simulatorRef.current}
            />

            {/* Tactical Live Statistics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#0b101c] border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Total Kendaraan Terdeteksi</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {detectionCards.length} Unit
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#0b101c] border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Merek Terkunci (Locked)</div>
                <div className="text-base font-bold text-cyan-400 mt-0.5">
                  {detectionCards.filter((c) => c.isLocked).length} Unit
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#0b101c] border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Status Validasi Plat</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {detectionCards.filter((c) => !c.needsPlateCheck).length} Valid /{" "}
                  <span className="text-amber-400">
                    {detectionCards.filter((c) => c.needsPlateCheck).length} Cek
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#0b101c] border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Kecepatan Sampling</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">
                  {settings.sampleIntervalSec}s / frame
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Selected Card Modal Detail (when card is clicked) */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-lg border border-amber-500/50 bg-[#0e1422] p-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h3 className="font-cctv-hud font-bold text-white text-base">
                  DETAIL DETEKSI KENDARAAN #{selectedCard.trackId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="w-full h-44 rounded bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                <img
                  src={selectedCard.cropDataUrl}
                  alt={`Crop ${selectedCard.plate}`}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">NOMOR PLAT (LPR)</span>
                  <span className="text-base font-bold text-amber-300 font-mono-plate">
                    {selectedCard.plate}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Akurasi: {(selectedCard.plateConfidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">MEREK KENDARAAN</span>
                  <span className="text-base font-bold text-cyan-300 capitalize">
                    {selectedCard.brand}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Akurasi: {(selectedCard.brandConfidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">WAKTU DETEKSI</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {selectedCard.timestamp}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">TIPE & STATUS</span>
                  <span className="text-sm font-semibold text-slate-200 capitalize">
                    {selectedCard.vehicleType} ({selectedCard.isLocked ? "Terkunci" : "Voting"})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCard(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 cursor-pointer"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice Modal on first load */}
      <PrivacyNoticeModal
        isOpen={showPrivacyNotice}
        onClose={handleClosePrivacyNotice}
      />
    </div>
  );
}
