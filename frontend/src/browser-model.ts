/** Actual on-device MobileNetV2 ONNX inference when the published model exists.
 * Nothing is classified unless an evaluated checkpoint manifest is available.
 * The input preprocessing mirrors ml.models.transform(training=False).
 */
import type { Prediction } from "./data";

const MODEL_ROOT = import.meta.env.BASE_URL + "models/";
const RUNTIME_ROOT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const LABELS = ["Fresh Apple", "Rotten or Defective Apple"] as const;

export type BrowserModelMetadata = {
  model_name: string;
  model_version: string;
  labels: [string, string];
  input_size: number;
  onnx_file: string;
  accuracy: number;
  f1: number;
  test_samples: number;
  dataset: string;
};

type OrtSession = {
  run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array | number[] }>>;
};
type OrtRuntime = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
  InferenceSession: { create: (path: string, options: Record<string, unknown>) => Promise<OrtSession> };
};

let metadataPromise: Promise<BrowserModelMetadata | null> | undefined;
let sessionPromise: Promise<{ ort: OrtRuntime; session: OrtSession }> | undefined;

function isManifest(value: unknown): value is BrowserModelMetadata {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<BrowserModelMetadata>;
  return m.model_name === "MobileNetV2" &&
    typeof m.model_version === "string" &&
    Array.isArray(m.labels) && m.labels.length === 2 &&
    m.labels[0] === LABELS[0] && m.labels[1] === LABELS[1] &&
    m.input_size === 224 &&
    m.onnx_file === "apple-mobilenet.onnx" &&
    Number.isFinite(m.accuracy) && (m.accuracy ?? -1) >= 0 && (m.accuracy ?? 2) <= 1 &&
    Number.isFinite(m.test_samples) && (m.test_samples ?? 0) >= 10;
}

export function getBrowserModelMetadata(): Promise<BrowserModelMetadata | null> {
  if (!metadataPromise) {
    metadataPromise = fetch(MODEL_ROOT + "manifest.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const value: unknown = await response.json();
        return isManifest(value) ? value : null;
      })
      .catch(() => null);
  }
  return metadataPromise;
}

async function loadSession(): Promise<{ ort: OrtRuntime; session: OrtSession }> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const meta = await getBrowserModelMetadata();
      if (!meta) throw new Error("An evaluated AI model is not published yet.");
      // Version pinned; CDN is used for the execution engine, not the model or photos.
      // The model is downloaded only from the ProduceAI website.
      const moduleUrl = RUNTIME_ROOT + "ort.min.mjs";
      const ort = (await import(/* @vite-ignore */ moduleUrl)) as OrtRuntime;
      ort.env.wasm.wasmPaths = RUNTIME_ROOT;
      ort.env.wasm.numThreads = 1; // iOS/Safari compatibility (no shared-memory requirement).
      const session = await ort.InferenceSession.create(
        MODEL_ROOT + meta.onnx_file,
        { executionProviders: ["wasm"], graphOptimizationLevel: "all" },
      );
      return { ort, session };
    })().catch((error: unknown) => {
      sessionPromise = undefined; // allow a retry after network errors
      throw error;
    });
  }
  return sessionPromise;
}

function toTensor(bitmap: ImageBitmap): Float32Array {
  const size = 224;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.drawImage(bitmap, 0, 0, size, size);
  const rgba = ctx.getImageData(0, 0, size, size).data;
  const values = new Float32Array(3 * size * size);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  for (let i = 0; i < size * size; i++) {
    for (let channel = 0; channel < 3; channel++) {
      values[channel * size * size + i] =
        (rgba[4 * i + channel] / 255 - mean[channel]) / std[channel];
    }
  }
  return values;
}

export async function classifyAppleInBrowser(
  file: File,
): Promise<Omit<Prediction, "timestamp" | "id">> {
  const started = performance.now();
  const [{ ort, session }, bitmap] = await Promise.all([
    loadSession(),
    createImageBitmap(file),
  ]);
  try {
    const input = new ort.Tensor("float32", toTensor(bitmap), [1, 3, 224, 224]);
    const output = await session.run({ image: input });
    const logits = output.logits?.data;
    if (!logits || logits.length !== 2 ||
        !Number.isFinite(logits[0]) || !Number.isFinite(logits[1])) {
      throw new Error("The AI model returned an invalid prediction.");
    }
    const max = Math.max(logits[0], logits[1]);
    const a = Math.exp(logits[0] - max), b = Math.exp(logits[1] - max);
    const p0 = a / (a + b), p1 = b / (a + b);
    const meta = await getBrowserModelMetadata();
    if (!meta) throw new Error("The AI model metadata is missing.");
    return {
      label: p0 >= p1 ? LABELS[0] : LABELS[1],
      probabilities: { [LABELS[0]]: p0, [LABELS[1]]: p1 },
      model_name: meta.model_name + " (on-device ONNX)",
      model_version: meta.model_version,
      inference_ms: Math.round((performance.now() - started) * 10) / 10,
    };
  } finally {
    bitmap.close();
  }
}
