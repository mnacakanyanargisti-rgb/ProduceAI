import { useEffect, useRef, useState, type PointerEvent } from "react";

type Point = { x: number; y: number };
type Rectangle = { x: number; y: number; width: number; height: number };

function bound(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function normalizeSelection(first: Point, second: Point): Rectangle {
  return {
    x: Math.min(first.x, second.x),
    y: Math.min(first.y, second.y),
    width: Math.abs(second.x - first.x),
    height: Math.abs(second.y - first.y),
  };
}

export async function cropPhoto(file: File, region: Rectangle): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const x = Math.round(bound(region.x) * bitmap.width);
    const y = Math.round(bound(region.y) * bitmap.height);
    const width = Math.min(bitmap.width - x, Math.round(bound(region.width) * bitmap.width));
    const height = Math.min(bitmap.height - y, Math.round(bound(region.height) * bitmap.height));
    if (width < 64 || height < 64) throw new Error("Select a larger part of the photo.");
    const size = Math.min(900, Math.max(width, height));
    const ratio = size / Math.max(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cannot crop on this device.");
    context.drawImage(bitmap, x, y, width, height, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to create cropped photo.")), "image/jpeg", 0.92),
    );
    return new File([jpeg], "apple-cropped.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export function AppleCropEditor({ file, onApply, onCancel }: {
  file: File;
  onApply: (file: File) => void;
  onCancel: () => void;
}) {
  const [preview, setPreview] = useState("");
  const [start, setStart] = useState<Point | null>(null);
  const [selection, setSelection] = useState<Rectangle | null>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const src = URL.createObjectURL(file);
    setPreview(src);
    return () => URL.revokeObjectURL(src);
  }, [file]);

  function point(e: PointerEvent<HTMLDivElement>): Point {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 0, y: 0 };
    return { x: bound((e.clientX - rect.left) / rect.width), y: bound((e.clientY - rect.top) / rect.height) };
  }

  function begin(e: PointerEvent<HTMLDivElement>) {
    const p = point(e);
    setStart(p);
    setSelection({ x: p.x, y: p.y, width: 0, height: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!start) return;
    setSelection(normalizeSelection(start, point(e)));
  }
  function end(e: PointerEvent<HTMLDivElement>) {
    if (!start) return;
    setSelection(normalizeSelection(start, point(e)));
    setStart(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  async function apply() {
    if (!selection || selection.width < 0.12 || selection.height < 0.12) {
      setError("Choose a larger rectangle containing the whole apple.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      onApply(await cropPhoto(file, selection));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cropping failed.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="panel" aria-label="Crop image to apple" style={{ marginTop: 14 }}>
      <h3>Crop to apple · Առանձնացրու խնձորը</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        Drag a rectangle around the whole apple. Exclude phone borders, Google text,
        buttons, and other objects. This crops the photo locally on your device.
      </p>
      <div
        data-testid="crop-canvas"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        style={{ position: "relative", width: "100%", touchAction: "none", cursor: "crosshair", userSelect: "none" }}
      >
        {preview && (
          <img
            ref={imageRef}
            src={preview}
            alt="Select the apple with a rectangle"
            draggable={false}
            style={{ display: "block", width: "100%", height: "auto", pointerEvents: "none", borderRadius: 12 }}
          />
        )}
        {selection && (
          <div
            data-testid="crop-selection"
            style={{
              position: "absolute",
              left: (selection.x * 100) + "%",
              top: (selection.y * 100) + "%",
              width: (selection.width * 100) + "%",
              height: (selection.height * 100) + "%",
              border: "3px solid #e7bf58",
              boxShadow: "0 0 0 9999px rgba(0,0,0,.36)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button className="button primary" type="button" disabled={processing || !selection} onClick={apply}>
          {processing ? "Cropping…" : "Use cropped photo"}
        </button>
        <button className="button secondary" type="button" disabled={processing} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
