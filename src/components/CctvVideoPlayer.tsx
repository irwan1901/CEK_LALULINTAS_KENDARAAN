import React, { useRef, useEffect, useState, useCallback } from "react";
import { Point, BoundingBox, TrackedVehicle } from "../types";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Crosshair,
  Sparkles,
  Camera,
  Layers,
  Radio,
  Check,
} from "lucide-react";

interface CctvVideoPlayerProps {
  videoUrl: string | null;
  imageUrl: string | null;
  isSimulatedDemo: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  roiPolygon: Point[];
  onChangeRoiPolygon: (points: Point[]) => void;
  trackedVehicles: TrackedVehicle[];
  processingFps: number;
  apiStatus: "idle" | "analyzing" | "rate_limited" | "error";
  onSampleFrameForAnalysis: (canvasOrVideo: HTMLCanvasElement | HTMLVideoElement) => void;
  onResetRoi: () => void;
  onSkipRoi: () => void;
  simulatorInstance?: any;
}

export const CctvVideoPlayer: React.FC<CctvVideoPlayerProps> = ({
  videoUrl,
  imageUrl,
  isSimulatedDemo,
  isPlaying,
  onTogglePlay,
  roiPolygon,
  onChangeRoiPolygon,
  trackedVehicles,
  processingFps,
  apiStatus,
  onResetRoi,
  onSkipRoi,
  simulatorInstance,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const simCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawingRoi, setIsDrawingRoi] = useState(false);
  const [tempPolygon, setTempPolygon] = useState<Point[]>([]);
  const [currentTimecode, setCurrentTimecode] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [showScanlines, setShowScanlines] = useState(true);

  // Keep live CCTV timestamp ticking
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, "0");
      setCurrentTimecode(`CAM-04 [REC] ${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}.${ms}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 50);
    return () => clearInterval(interval);
  }, []);

  // Sync video play/pause
  useEffect(() => {
    if (!videoRef.current || isSimulatedDemo || imageUrl) return;
    if (isPlaying) {
      videoRef.current.play().catch((e) => {
        console.warn("Video playback error:", e);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isSimulatedDemo, imageUrl]);

  // Video time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setVideoCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setVideoCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Start ROI Drawing
  const handleStartDrawRoi = () => {
    setIsDrawingRoi(true);
    setTempPolygon([]);
  };

  // Complete ROI Drawing
  const handleFinishDrawRoi = () => {
    if (tempPolygon.length >= 3) {
      onChangeRoiPolygon([...tempPolygon]);
    }
    setIsDrawingRoi(false);
    setTempPolygon([]);
  };

  // Canvas click for drawing ROI
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRoi) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const newPoints = [...tempPolygon, { x, y }];
    setTempPolygon(newPoints);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Main Render Loop for Canvas Overlay
  useEffect(() => {
    let animId: number;

    const renderOverlay = () => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // If simulated demo is active, update simulator on simCanvasRef
      if (isSimulatedDemo && simulatorInstance && simCanvasRef.current) {
        const simCtx = simCanvasRef.current.getContext("2d");
        if (simCtx) {
          simulatorInstance.updateAndRender(
            simCtx,
            simCanvasRef.current.width,
            simCanvasRef.current.height
          );
        }
      }

      // Draw ROI Polygon
      const activePoly = isDrawingRoi ? tempPolygon : roiPolygon;
      if (activePoly && activePoly.length >= 2) {
        ctx.save();
        ctx.beginPath();
        const startX = activePoly[0].x * width;
        const startY = activePoly[0].y * height;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < activePoly.length; i++) {
          ctx.lineTo(activePoly[i].x * width, activePoly[i].y * height);
        }

        if (activePoly.length >= 3 && !isDrawingRoi) {
          ctx.closePath();
          // Semi-transparent yellow fill
          ctx.fillStyle = "rgba(234, 179, 8, 0.18)";
          ctx.fill();
        }

        // Yellow dashed boundary
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw vertex points
        activePoly.forEach((p, idx) => {
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(p.x * width, p.y * height, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Coordinate label in drawing mode
          if (isDrawingRoi) {
            ctx.fillStyle = "#fef08a";
            ctx.font = "9px 'JetBrains Mono', monospace";
            ctx.fillText(`P${idx + 1}`, p.x * width + 6, p.y * height - 4);
          }
        });

        // ROI Label
        if (activePoly.length >= 3) {
          const first = activePoly[0];
          ctx.fillStyle = "#eab308";
          ctx.font = "bold 11px 'Chakra Petch', sans-serif";
          ctx.fillText("DETECTION ROI [ACTIVE]", first.x * width + 8, first.y * height + 16);
        }
        ctx.restore();
      }

      // Draw Tracked Vehicles: Blue Bounding Box with "car" label
      trackedVehicles.forEach((vehicle) => {
        const { bbox, trackId } = vehicle;
        const bx = bbox.x * width;
        const by = bbox.y * height;
        const bw = bbox.width * width;
        const bh = bbox.height * height;

        ctx.save();
        // Blue bounding box
        ctx.strokeStyle = "#0284c7"; // sky-600 / blue
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Surveillance corner brackets
        const cornerLen = Math.min(12, bw * 0.25, bh * 0.25);
        ctx.strokeStyle = "#38bdf8"; // bright cyan blue
        ctx.lineWidth = 3;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(bx, by + cornerLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + cornerLen, by);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - cornerLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + cornerLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - cornerLen);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + cornerLen, by + bh);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - cornerLen, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - cornerLen);
        ctx.stroke();

        // Blue label badge with "car" and trackId
        const labelText = `car #${trackId}${vehicle.isLocked ? " [LOCKED]" : ""}`;
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        const textMetrics = ctx.measureText(labelText);
        const padX = 6;
        const badgeW = textMetrics.width + padX * 2;
        const badgeH = 18;

        ctx.fillStyle = "rgba(2, 132, 199, 0.9)";
        ctx.fillRect(bx, Math.max(0, by - badgeH), badgeW, badgeH);

        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, bx + padX, Math.max(badgeH / 2, by - badgeH / 2));

        // If best plate is available, show below box
        if (vehicle.bestPlate && vehicle.bestPlate !== "UNKNOWN") {
          const plateText = vehicle.bestPlate;
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.strokeStyle = "#eab308";
          ctx.lineWidth = 1;
          const pMetrics = ctx.measureText(plateText);
          const pW = pMetrics.width + 10;
          ctx.fillRect(bx, by + bh, pW, 16);
          ctx.strokeRect(bx, by + bh, pW, 16);
          ctx.fillStyle = "#facc15";
          ctx.fillText(plateText, bx + 5, by + bh + 8);
        }

        ctx.restore();
      });

      // Subtle CCTV HUD Grid Crosshair Center
      ctx.save();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.lineWidth = 1;
      const midX = width / 2;
      const midY = height / 2;
      ctx.beginPath();
      ctx.moveTo(midX - 20, midY);
      ctx.lineTo(midX + 20, midY);
      ctx.moveTo(midX, midY - 20);
      ctx.lineTo(midX, midY + 20);
      ctx.stroke();

      // Viewport 4 Corners CCTV Target Brackets
      const frameBracket = 24;
      const margin = 16;
      ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
      ctx.lineWidth = 2;
      // TL
      ctx.beginPath();
      ctx.moveTo(margin, margin + frameBracket);
      ctx.lineTo(margin, margin);
      ctx.lineTo(margin + frameBracket, margin);
      // TR
      ctx.moveTo(width - margin - frameBracket, margin);
      ctx.lineTo(width - margin, margin);
      ctx.lineTo(width - margin, margin + frameBracket);
      // BL
      ctx.moveTo(margin, height - margin - frameBracket);
      ctx.lineTo(margin, height - margin);
      ctx.lineTo(margin + frameBracket, height - margin);
      // BR
      ctx.moveTo(width - margin - frameBracket, height - margin);
      ctx.lineTo(width - margin, height - margin);
      ctx.lineTo(width - margin, height - margin - frameBracket);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(renderOverlay);
    };

    animId = requestAnimationFrame(renderOverlay);
    return () => cancelAnimationFrame(animId);
  }, [
    roiPolygon,
    tempPolygon,
    isDrawingRoi,
    trackedVehicles,
    isSimulatedDemo,
    simulatorInstance,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#080d17] rounded-lg border border-slate-800 shadow-2xl overflow-hidden ${
        isFullscreen ? "h-screen w-screen rounded-none" : ""
      }`}
    >
      {/* CCTV Top Status Ribbon */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#0b101c] border-b border-slate-800/80 text-xs font-mono select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
            <span className="text-red-500 font-bold uppercase tracking-wider font-cctv-hud">
              LIVE SURVEILLANCE
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            {isSimulatedDemo ? "STREAM: SIMULASI TRAFFIC LOKAL" : imageUrl ? "MODE: ANALISIS GAMBAR TUNGGAL" : "STREAM: CCTV HIGHWAY HD"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">API:</span>
            {apiStatus === "analyzing" ? (
              <span className="text-cyan-400 flex items-center gap-1 animate-pulse">
                <Radio className="w-3 h-3 animate-spin" /> PROSES AI
              </span>
            ) : apiStatus === "rate_limited" ? (
              <span className="text-amber-400">RATE LIMITED (2/s)</span>
            ) : apiStatus === "error" ? (
              <span className="text-rose-400 font-bold">ERROR</span>
            ) : (
              <span className="text-emerald-400">SIAGA</span>
            )}
          </div>

          <button
            onClick={() => setShowScanlines(!showScanlines)}
            className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
              showScanlines
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
            title="Toggle Efek Scanline CRT CCTV"
          >
            CRT: {showScanlines ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Main Video / Canvas Viewport */}
      <div className="relative flex-1 min-h-[360px] md:min-h-[460px] bg-black flex items-center justify-center overflow-hidden">
        {/* Source 1: Video File */}
        {videoUrl && !isSimulatedDemo && !imageUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            loop
            muted
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Source 2: Static Image */}
        {imageUrl && !isSimulatedDemo && (
          <img
            src={imageUrl}
            alt="Source Frame"
            className="w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Source 3: Simulated Traffic Canvas */}
        {isSimulatedDemo && (
          <canvas
            ref={simCanvasRef}
            width={960}
            height={540}
            className="w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Interactive Overlay Canvas for ROI and Tracking Boxes */}
        <canvas
          ref={overlayCanvasRef}
          width={960}
          height={540}
          onClick={handleCanvasClick}
          className={`absolute inset-0 w-full h-full object-contain z-10 ${
            isDrawingRoi ? "cursor-crosshair" : "cursor-default"
          }`}
        />

        {/* Optional CRT Scanlines Layer */}
        {showScanlines && (
          <div className="absolute inset-0 cctv-scanlines pointer-events-none z-20 opacity-40"></div>
        )}

        {/* CCTV OSD Overlay (Top Left: Timestamp & FPS) */}
        <div className="absolute top-3 left-4 z-30 pointer-events-none font-cctv-hud space-y-0.5 select-none">
          {/* Red CCTV Timestamp */}
          <div className="text-red-500 font-bold text-sm md:text-base tracking-widest hud-glow-red">
            {currentTimecode}
          </div>
          {/* Processing FPS and Buffer */}
          <div className="text-[11px] font-mono text-cyan-400 font-semibold tracking-wider flex items-center gap-2">
            <span>FPS: {processingFps.toFixed(1)}</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-300">
              VEHICLES: {trackedVehicles.length}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">RESOLUTION: 1080P_SURV</span>
          </div>
        </div>

        {/* Drawing Mode Prompt Banner */}
        {isDrawingRoi && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-black px-4 py-1.5 rounded-full font-cctv-hud font-bold text-xs shadow-lg flex items-center gap-2 animate-bounce">
            <Crosshair className="w-4 h-4" />
            <span>Klik titik demi titik untuk membuat poligon ROI ({tempPolygon.length} titik)</span>
            <button
              onClick={handleFinishDrawRoi}
              className="ml-2 px-2 py-0.5 rounded bg-black text-amber-400 text-[10px] uppercase font-mono hover:bg-slate-900 cursor-pointer"
            >
              Selesai [Enter]
            </button>
          </div>
        )}
      </div>

      {/* Video Progress Bar (when real video is loaded) */}
      {videoUrl && videoDuration > 0 && !isSimulatedDemo && (
        <div className="px-3 pt-2 bg-[#0c121e] flex items-center gap-3 text-xs font-mono text-slate-400">
          <span>{formatTime(videoCurrentTime)}</span>
          <input
            type="range"
            min="0"
            max={videoDuration || 100}
            step="0.1"
            value={videoCurrentTime}
            onChange={handleSeek}
            className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span>{formatTime(videoDuration)}</span>
        </div>
      )}

      {/* CCTV Control & ROI Bar */}
      <div className="p-3 bg-[#0c121e] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded font-cctv-hud font-bold transition shadow-sm cursor-pointer ${
              isPlaying
                ? "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>JEDA</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400" />
                <span>MULAI ANALISIS</span>
              </>
            )}
          </button>
        </div>

        {/* Center: ROI Polygon Controls */}
        <div className="flex items-center gap-2">
          {!isDrawingRoi ? (
            <button
              onClick={handleStartDrawRoi}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-cctv-hud font-semibold transition cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>Gambar Poligon ROI</span>
            </button>
          ) : (
            <button
              onClick={handleFinishDrawRoi}
              disabled={tempPolygon.length < 3}
              className={`flex items-center gap-1 px-3 py-1.5 rounded font-cctv-hud font-bold transition cursor-pointer ${
                tempPolygon.length >= 3
                  ? "bg-amber-500 text-black hover:bg-amber-400"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Selesai ROI ({tempPolygon.length})</span>
            </button>
          )}

          <button
            onClick={onResetRoi}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Hapus Poligon ROI saat ini"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset ROI</span>
          </button>

          <button
            onClick={onSkipRoi}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Analisis seluruh frame tanpa batasan ROI"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Lewati ROI</span>
          </button>
        </div>

        {/* Right: Fullscreen & Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Layar Penuh"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
