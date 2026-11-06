export interface Point {
  x: number; // 0 to 1 (normalized to video/canvas dimensions)
  y: number; // 0 to 1
}

export interface BoundingBox {
  x: number; // 0 to 1 normalized
  y: number;
  width: number;
  height: number;
}

export interface PlateReading {
  plate: string;
  confidence: number;
  timestamp: number;
}

export interface BrandReading {
  brand: string;
  confidence: number;
  timestamp: number;
}

export interface TrackedVehicle {
  trackId: number;
  bbox: BoundingBox;
  pixelBbox?: { x: number; y: number; width: number; height: number };
  firstSeen: number;
  lastSeen: number;
  plateReadings: PlateReading[];
  brandReadings: BrandReading[];
  lockedBrand?: string;
  lockedBrandConfidence?: number;
  bestPlate?: string;
  bestPlateConfidence?: number;
  cropDataUrl?: string;
  vehicleType?: string;
  timestamp: string;
  needsPlateCheck: boolean;
  isLocked: boolean; // brand locked after threshold votes
  pendingAnalysis: boolean;
  lastAnalysisTime: number;
}

export interface DetectionCard {
  trackId: number;
  plate: string;
  plateConfidence: number;
  brand: string;
  brandConfidence: number;
  cropDataUrl: string;
  timestamp: string;
  needsPlateCheck: boolean;
  vehicleType: string;
  readingCount: number;
  isLocked: boolean;
}

export interface AppSettings {
  brandConfidenceThreshold: number; // default 0.25
  votingCount: number; // default 3
  sampleIntervalSec: number; // default 0.5s
  allowedBrands: string[];
  plateRegexPattern: string; // default e.g. Indonesian or alphanumeric
}

export interface AnalyzeApiResponse {
  plate_text: string;
  plate_confidence: number;
  brand: string;
  brand_confidence: number;
  vehicle_type: string;
  error?: string;
}

export const INITIAL_BRANDS = [
  "audi", "bmw", "chevrolet", "ford", "honda", "hyundai", "kia", "landrover",
  "lexus", "mazda", "mercedes", "mitsubishi", "nissan", "peugeot", "porsche",
  "suzuki", "toyota", "vinfast", "mahindra", "tata", "volkswagen", "renault",
  "daihatsu", "wuling", "isuzu"
];

export const DEFAULT_SETTINGS: AppSettings = {
  brandConfidenceThreshold: 0.25,
  votingCount: 3,
  sampleIntervalSec: 0.5,
  allowedBrands: [...INITIAL_BRANDS],
  plateRegexPattern: "^[A-Z]{1,2}\\s?[0-9]{1,4}\\s?[A-Z]{1,3}$",
};
