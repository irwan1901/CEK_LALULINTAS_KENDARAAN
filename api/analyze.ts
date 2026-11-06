import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface AnalyzeResult {
  plate_text: string;
  plate_confidence: number;
  brand: string;
  brand_confidence: number;
  vehicle_type: string;
}

export const ALLOWED_BRANDS = [
  "audi", "bmw", "chevrolet", "ford", "honda", "hyundai", "kia", "landrover",
  "lexus", "mazda", "mercedes", "mitsubishi", "nissan", "peugeot", "porsche",
  "suzuki", "toyota", "vinfast", "mahindra", "tata", "volkswagen", "renault",
  "daihatsu", "wuling", "isuzu"
];

// Helper to clean base64 string
export function parseBase64Image(dataUriOrBase64: string): { mimeType: string; data: string } {
  const match = dataUriOrBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }
  // Default to JPEG if raw base64 string is sent
  return {
    mimeType: "image/jpeg",
    data: dataUriOrBase64,
  };
}

export async function processAnalyzeRequest(imageBase64: string): Promise<AnalyzeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING: Environment variable GEMINI_API_KEY belum disetel di server.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const { mimeType, data } = parseBase64Image(imageBase64);

  const prompt = `Analisis gambar potongan kendaraan ini untuk sistem CCTV LPR-Brand Vision.
Instruksi:
1. Baca plat nomor kendaraan (LPR / ANPR) secara akurat. Jangan menebak karakter yang buram atau tidak tampak. Jika tidak terlihat atau tidak ada plat, kembalikan 'unknown'.
2. Kenali merek kendaraan dari logo, emblem, pola grille, atau bentuk bodi.
Daftar merek yang diutamakan: ${ALLOWED_BRANDS.join(", ")}. Jika logo/merek tidak jelas atau di luar daftar, kembalikan 'unknown'. Tulis nama merek dalam huruf kecil (lowercase).
3. Tentukan confidence score (0.0 sampai 1.0) untuk plat_confidence dan brand_confidence.
4. Identifikasi jenis kendaraan (sedan, suv, mpv, hatchback, truck, van, pickup, motorcycle, unknown).
Jawab HANYA menggunakan format JSON terstruktur yang telah ditentukan.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      systemInstruction:
        "Anda adalah modul AI OCR plat nomor (License Plate Recognition) dan klasifikasi merek mobil profesional berakurasi tinggi untuk sistem surveillance CCTV. Gunakan huruf kecil untuk merek mobil. Jika ragu jangan mengarang, gunakan 'unknown'.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plate_text: {
            type: Type.STRING,
            description: "Nomor plat kendaraan terdeteksi (kapital), atau 'unknown'",
          },
          plate_confidence: {
            type: Type.NUMBER,
            description: "Tingkat keyakinan plat antara 0.0 sampai 1.0",
          },
          brand: {
            type: Type.STRING,
            description: "Nama merek mobil dalam huruf kecil (misal: toyota, honda, bmw) atau 'unknown'",
          },
          brand_confidence: {
            type: Type.NUMBER,
            description: "Tingkat keyakinan merek antara 0.0 sampai 1.0",
          },
          vehicle_type: {
            type: Type.STRING,
            description: "Tipe kendaraan seperti sedan, suv, mpv, truck, dsb.",
          },
        },
        required: ["plate_text", "plate_confidence", "brand", "brand_confidence", "vehicle_type"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("EMPTY_RESPONSE: Model tidak mengembalikan hasil teks.");
  }

  try {
    const parsed = JSON.parse(text) as AnalyzeResult;
    return {
      plate_text: (parsed.plate_text || "unknown").trim().toUpperCase(),
      plate_confidence: typeof parsed.plate_confidence === "number" ? parsed.plate_confidence : 0,
      brand: (parsed.brand || "unknown").toLowerCase().trim(),
      brand_confidence: typeof parsed.brand_confidence === "number" ? parsed.brand_confidence : 0,
      vehicle_type: (parsed.vehicle_type || "unknown").toLowerCase().trim(),
    };
  } catch (err) {
    console.error("Failed to parse Gemini response JSON:", text, err);
    throw new Error("PARSING_ERROR: Format respon JSON dari model tidak valid.");
  }
}

// Vercel serverless function export
export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Hanya metode POST yang diizinkan." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // keep as is
      }
    }

    const imageBase64 = body?.imageBase64 || body?.image;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        error: "Bad Request: Parameter 'imageBase64' diperlukan dalam body JSON.",
      });
    }

    const result = await processAnalyzeRequest(imageBase64);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("API /api/analyze error:", error);
    const message = error?.message || "Terjadi kesalahan internal server saat menganalisis gambar.";
    const status = message.includes("GEMINI_API_KEY_MISSING") ? 500 : 502;
    return res.status(status).json({
      error: message,
    });
  }
}
