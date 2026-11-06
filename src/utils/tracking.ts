import { BoundingBox, BrandReading, DetectionCard, PlateReading, Point, TrackedVehicle } from "../types";

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return true; // If no valid polygon, assume entire area is ROI
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if the center of a bounding box is within ROI polygon.
 */
export function isBBoxInPolygon(bbox: BoundingBox, polygon: Point[]): boolean {
  if (polygon.length < 3) return true;
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;
  return isPointInPolygon({ x: centerX, y: centerY }, polygon);
}

/**
 * Calculate Intersection over Union (IoU) of two bounding boxes.
 */
export function calculateIoU(a: BoundingBox, b: BoundingBox): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  const xOverlap = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const intersection = xOverlap * yOverlap;

  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  if (union <= 0) return 0;
  return intersection / union;
}

/**
 * Test license plate against regex pattern.
 */
export function validatePlateRegex(plate: string, pattern: string): boolean {
  if (!plate || plate.toLowerCase() === "unknown") return false;
  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(plate.trim());
  } catch (e) {
    console.warn("Invalid regex pattern:", pattern, e);
    return true;
  }
}

/**
 * Vote for brand based on frequency and threshold.
 * If brand count >= requiredVotes, returns locked brand and confidence.
 */
export function aggregateBrandVoting(
  readings: BrandReading[],
  requiredVotes: number,
  confidenceThreshold: number
): { brand: string; confidence: number; isLocked: boolean } {
  if (readings.length === 0) {
    return { brand: "unknown", confidence: 0, isLocked: false };
  }

  // Count occurrences per brand
  const counts: Record<string, { count: number; totalConf: number; maxConf: number }> = {};
  for (const r of readings) {
    const b = r.brand.toLowerCase().trim();
    if (!counts[b]) {
      counts[b] = { count: 0, totalConf: 0, maxConf: 0 };
    }
    counts[b].count += 1;
    counts[b].totalConf += r.confidence;
    counts[b].maxConf = Math.max(counts[b].maxConf, r.confidence);
  }

  // Sort by count descending, then by average confidence
  const sorted = Object.entries(counts).sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    return b[1].maxConf - a[1].maxConf;
  });

  const [topBrand, stats] = sorted[0];
  const avgConf = stats.totalConf / stats.count;
  const isLocked = stats.count >= requiredVotes && topBrand !== "unknown";

  // Check confidence threshold
  if (avgConf < confidenceThreshold) {
    return { brand: "unknown", confidence: avgConf, isLocked };
  }

  return {
    brand: topBrand,
    confidence: avgConf,
    isLocked,
  };
}

/**
 * Select best plate string: most frequent, tie broken by highest confidence.
 */
export function aggregatePlateVoting(
  readings: PlateReading[]
): { plate: string; confidence: number } {
  const validReadings = readings.filter(
    (r) => r.plate && r.plate.toLowerCase() !== "unknown"
  );
  if (validReadings.length === 0) {
    return { plate: "UNKNOWN", confidence: 0 };
  }

  const counts: Record<string, { count: number; maxConf: number }> = {};
  for (const r of validReadings) {
    const cleanPlate = r.plate.trim().toUpperCase();
    if (!counts[cleanPlate]) {
      counts[cleanPlate] = { count: 0, maxConf: 0 };
    }
    counts[cleanPlate].count += 1;
    counts[cleanPlate].maxConf = Math.max(counts[cleanPlate].maxConf, r.confidence);
  }

  const sorted = Object.entries(counts).sort((a, b) => {
    if (b[1].count !== a[1].count) {
      return b[1].count - a[1].count;
    }
    return b[1].maxConf - a[1].maxConf;
  });

  const [bestPlate, stats] = sorted[0];
  return {
    plate: bestPlate,
    confidence: stats.maxConf,
  };
}

/**
 * Crop vehicle bounding box from canvas or video and return JPEG data URL.
 */
export function cropVehicleFromSource(
  source: HTMLVideoElement | HTMLCanvasElement,
  bbox: BoundingBox
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const srcWidth = "videoWidth" in source ? source.videoWidth || source.width : source.width;
  const srcHeight = "videoHeight" in source ? source.videoHeight || source.height : source.height;

  // Add 10% padding around bounding box for context (grille + plate)
  const padX = bbox.width * 0.1;
  const padY = bbox.height * 0.1;

  const cropX = Math.max(0, Math.floor((bbox.x - padX) * srcWidth));
  const cropY = Math.max(0, Math.floor((bbox.y - padY) * srcHeight));
  const cropW = Math.min(srcWidth - cropX, Math.ceil((bbox.width + padX * 2) * srcWidth));
  const cropH = Math.min(srcHeight - cropY, Math.ceil((bbox.height + padY * 2) * srcHeight));

  if (cropW <= 10 || cropH <= 10) return "";

  // Target size (max 512px)
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(cropW, cropH));
  canvas.width = Math.round(cropW * scale);
  canvas.height = Math.round(cropH * scale);

  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Export detections list to CSV file.
 * Columns: track_id, plate, brand, brand_confidence, timestamp
 */
export function exportToCSV(detections: DetectionCard[], filename = "lpr_brand_detections.csv"): void {
  const headers = ["track_id", "plate", "brand", "brand_confidence", "timestamp"];
  const rows = detections.map((d) => [
    d.trackId,
    `"${d.plate.replace(/"/g, '""')}"`,
    `"${d.brand.toLowerCase()}"`,
    d.brandConfidence.toFixed(2),
    `"${d.timestamp}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export detections list to JSON file.
 */
export function exportToJSON(detections: DetectionCard[], filename = "lpr_brand_detections.json"): void {
  const data = detections.map((d) => ({
    track_id: d.trackId,
    plate: d.plate,
    brand: d.brand.toLowerCase(),
    brand_confidence: parseFloat(d.brandConfidence.toFixed(2)),
    timestamp: d.timestamp,
  }));

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
