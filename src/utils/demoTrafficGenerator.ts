import { DetectionCard } from "../types";

export interface DemoSimVehicle {
  id: number;
  x: number; // 0..1
  y: number; // 0..1
  width: number;
  height: number;
  speed: number;
  color: string;
  brand: string;
  plate: string;
  vehicleType: string;
  lane: number;
}

export const SAMPLE_DEMO_DETECTIONS: DetectionCard[] = [
  {
    trackId: 101,
    plate: "B 1984 RFS",
    plateConfidence: 0.96,
    brand: "toyota",
    brandConfidence: 0.94,
    cropDataUrl: createPlatePreviewPlaceholder("B 1984 RFS", "toyota", "#2563eb"),
    timestamp: "22:04:12",
    needsPlateCheck: false,
    vehicleType: "suv",
    readingCount: 4,
    isLocked: true,
  },
  {
    trackId: 102,
    plate: "D 8888 XY",
    plateConfidence: 0.91,
    brand: "honda",
    brandConfidence: 0.88,
    cropDataUrl: createPlatePreviewPlaceholder("D 8888 XY", "honda", "#dc2626"),
    timestamp: "22:04:05",
    needsPlateCheck: false,
    vehicleType: "sedan",
    readingCount: 3,
    isLocked: true,
  },
  {
    trackId: 103,
    plate: "B 5432 TES",
    plateConfidence: 0.84,
    brand: "bmw",
    brandConfidence: 0.79,
    cropDataUrl: createPlatePreviewPlaceholder("B 5432 TES", "bmw", "#0284c7"),
    timestamp: "22:03:48",
    needsPlateCheck: false,
    vehicleType: "sedan",
    readingCount: 3,
    isLocked: true,
  },
  {
    trackId: 104,
    plate: "DK 4040 ???",
    plateConfidence: 0.42,
    brand: "unknown",
    brandConfidence: 0.18,
    cropDataUrl: createPlatePreviewPlaceholder("DK 4040 ???", "unknown", "#475569"),
    timestamp: "22:03:30",
    needsPlateCheck: true,
    vehicleType: "hatchback",
    readingCount: 2,
    isLocked: false,
  },
  {
    trackId: 105,
    plate: "L 1029 KAA",
    plateConfidence: 0.89,
    brand: "mitsubishi",
    brandConfidence: 0.85,
    cropDataUrl: createPlatePreviewPlaceholder("L 1029 KAA", "mitsubishi", "#059669"),
    timestamp: "22:03:15",
    needsPlateCheck: false,
    vehicleType: "mpv",
    readingCount: 3,
    isLocked: true,
  },
  {
    trackId: 106,
    plate: "B 99 ZZ",
    plateConfidence: 0.74,
    brand: "mercedes",
    brandConfidence: 0.82,
    cropDataUrl: createPlatePreviewPlaceholder("B 99 ZZ", "mercedes", "#4f46e5"),
    timestamp: "22:02:50",
    needsPlateCheck: false,
    vehicleType: "sedan",
    readingCount: 3,
    isLocked: true,
  },
];

/**
 * Creates an authentic synthetic thumbnail for license plate & car front preview
 */
export function createPlatePreviewPlaceholder(
  plate: string,
  brand: string,
  carColor: string
): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Dark surveillance vehicle crop background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 240, 160);

  // Car bumper / grille body
  ctx.fillStyle = carColor;
  ctx.beginPath();
  ctx.roundRect(20, 20, 200, 110, 8);
  ctx.fill();

  // Car Grille
  ctx.fillStyle = "#0b0f19";
  ctx.beginPath();
  ctx.roundRect(40, 45, 160, 45, 4);
  ctx.fill();

  // Grille slats
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  for (let i = 50; i < 90; i += 7) {
    ctx.beginPath();
    ctx.moveTo(42, i);
    ctx.lineTo(198, i);
    ctx.stroke();
  }

  // Brand emblem indicator
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 10px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(brand.toUpperCase(), 120, 40);

  // Headlights
  ctx.fillStyle = "#fef08a";
  ctx.shadowColor = "#fef08a";
  ctx.shadowBlur = 10;
  ctx.fillRect(24, 48, 14, 25);
  ctx.fillRect(202, 48, 14, 25);
  ctx.shadowBlur = 0;

  // License plate frame
  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.fillRect(60, 96, 120, 32);
  ctx.strokeRect(60, 96, 120, 32);

  // Plate text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(plate, 120, 112);

  // Surveillance watermark
  ctx.fillStyle = "rgba(245, 158, 11, 0.7)";
  ctx.font = "8px monospace";
  ctx.textAlign = "right";
  ctx.fillText("CAM-04 CROP", 232, 152);

  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Traffic Simulator that renders continuously onto a canvas
 */
export class TrafficSimulator {
  private vehicles: DemoSimVehicle[] = [];
  private nextId = 200;
  private lastSpawn = 0;

  private samplePlates = [
    { plate: "B 1234 KLR", brand: "toyota", type: "suv", color: "#1e293b" },
    { plate: "D 7788 XY", brand: "honda", type: "sedan", color: "#991b1b" },
    { plate: "B 4444 BOS", brand: "bmw", type: "sedan", color: "#1e3a8a" },
    { plate: "F 1010 RAC", brand: "mitsubishi", type: "suv", color: "#065f46" },
    { plate: "B 8901 EV", brand: "hyundai", type: "hatchback", color: "#374151" },
    { plate: "B 5555 VIP", brand: "mercedes", type: "sedan", color: "#0f172a" },
    { plate: "DK 911 GT", brand: "porsche", type: "sedan", color: "#b91c1c" },
    { plate: "B 2024 WLG", brand: "wuling", type: "mpv", color: "#475569" },
    { plate: "A 3456 SZK", brand: "suzuki", type: "hatchback", color: "#155e75" },
    { plate: "E 8888 BAD", brand: "unknown", type: "sedan", color: "#334155" },
  ];

  constructor() {
    this.spawnVehicle(0.15, 0.35);
    this.spawnVehicle(0.50, 0.65);
    this.spawnVehicle(0.80, 0.15);
  }

  private spawnVehicle(laneRatio: number, startY: number = 0.05) {
    const sample = this.samplePlates[Math.floor(Math.random() * this.samplePlates.length)];
    this.vehicles.push({
      id: this.nextId++,
      x: laneRatio - 0.08,
      y: startY,
      width: 0.16,
      height: 0.16,
      speed: 0.0015 + Math.random() * 0.0015,
      color: sample.color,
      brand: sample.brand,
      plate: sample.plate,
      vehicleType: sample.type,
      lane: Math.floor(laneRatio * 3),
    });
  }

  public updateAndRender(ctx: CanvasRenderingContext2D, width: number, height: number): DemoSimVehicle[] {
    const now = Date.now();
    if (now - this.lastSpawn > 3200 && this.vehicles.length < 5) {
      const lanes = [0.22, 0.50, 0.78];
      const selectedLane = lanes[Math.floor(Math.random() * lanes.length)];
      this.spawnVehicle(selectedLane, 0.02);
      this.lastSpawn = now;
    }

    // Draw Highway / CCTV Road
    ctx.fillStyle = "#0b101b";
    ctx.fillRect(0, 0, width, height);

    // Asphalt road surface
    ctx.fillStyle = "#151e2e";
    ctx.beginPath();
    ctx.moveTo(width * 0.05, 0);
    ctx.lineTo(width * 0.95, 0);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    // Road side barriers
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width * 0.05, 0);
    ctx.lineTo(0, height);
    ctx.moveTo(width * 0.95, 0);
    ctx.lineTo(width, height);
    ctx.stroke();

    // Lane divider dashed lines
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.setLineDash([20, 15]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.35, 0);
    ctx.lineTo(width * 0.33, height);
    ctx.moveTo(width * 0.65, 0);
    ctx.lineTo(width * 0.67, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Update and draw vehicles
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.y += v.speed;

      // Perspective scale: vehicles get slightly larger as they approach camera
      const scale = 0.8 + v.y * 0.6;
      const vPixelW = width * v.width * scale;
      const vPixelH = height * v.height * scale;
      const vPixelX = width * (v.x + 0.08) - vPixelW / 2;
      const vPixelY = height * v.y;

      // Draw car shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.ellipse(
        vPixelX + vPixelW / 2,
        vPixelY + vPixelH * 0.85,
        vPixelW * 0.55,
        vPixelH * 0.2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Draw car body
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(vPixelX, vPixelY, vPixelW, vPixelH * 0.8, 8);
      ctx.fill();

      // Car windshield
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.roundRect(
        vPixelX + vPixelW * 0.12,
        vPixelY + vPixelH * 0.1,
        vPixelW * 0.76,
        vPixelH * 0.25,
        4
      );
      ctx.fill();

      // Car grille
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.roundRect(
        vPixelX + vPixelW * 0.18,
        vPixelY + vPixelH * 0.42,
        vPixelW * 0.64,
        vPixelH * 0.2,
        3
      );
      ctx.fill();

      // Brand emblem
      ctx.fillStyle = "#f8fafc";
      ctx.font = `bold ${Math.max(9, Math.round(11 * scale))}px 'Chakra Petch', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(v.brand.toUpperCase(), vPixelX + vPixelW / 2, vPixelY + vPixelH * 0.55);

      // Headlights with beam
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(vPixelX + vPixelW * 0.05, vPixelY + vPixelH * 0.45, vPixelW * 0.1, vPixelH * 0.15);
      ctx.fillRect(vPixelX + vPixelW * 0.85, vPixelY + vPixelH * 0.45, vPixelW * 0.1, vPixelH * 0.15);

      // Plate on front bumper
      ctx.fillStyle = "#000000";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      const plateW = vPixelW * 0.58;
      const plateH = vPixelH * 0.16;
      const plateX = vPixelX + (vPixelW - plateW) / 2;
      const plateY = vPixelY + vPixelH * 0.64;
      ctx.fillRect(plateX, plateY, plateW, plateH);
      ctx.strokeRect(plateX, plateY, plateW, plateH);

      // Plate text
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(9, Math.round(11 * scale))}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = "middle";
      ctx.fillText(v.plate, plateX + plateW / 2, plateY + plateH / 2);

      // Remove vehicles that left bottom edge
      if (v.y > 1.1) {
        this.vehicles.splice(i, 1);
      }
    }

    return [...this.vehicles];
  }
}
