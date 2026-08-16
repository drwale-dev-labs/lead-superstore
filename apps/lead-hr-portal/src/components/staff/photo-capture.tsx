"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, Upload, X } from "lucide-react";

const MIN_DIMENSION = 400;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB — matches the existing staff photo upload limit

type Props = {
  onChange: (file: File | null, previewUrl: string | null) => void;
};

export function PhotoCapture({ onChange }: Props) {
  const [mode, setMode] = useState<"idle" | "camera" | "review">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  async function startCamera() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(s);
      setMode("camera");
      // Video element mounts this render; attach stream on next tick
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      });
    } catch {
      setError("Could not access camera. Check browser permissions, or upload a file instead.");
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth < MIN_DIMENSION || video.videoHeight < MIN_DIMENSION) {
      setError(
        `Camera resolution too low (${video.videoWidth}×${video.videoHeight}). Minimum is ${MIN_DIMENSION}×${MIN_DIMENSION}px.`,
      );
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (blob.size > MAX_SIZE_BYTES) {
          setError(`Photo exceeds ${(MAX_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB limit.`);
          return;
        }
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPreview(dataUrl);
        setMode("review");
        onChange(file, dataUrl);
        stopCamera();
      },
      "image/jpeg",
      0.92,
    );
  }

  function retake() {
    setPreview(null);
    setError(null);
    onChange(null, null);
    startCamera();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    if (!selected) {
      onChange(null, null);
      setPreview(null);
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setError(`File exceeds ${(MAX_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB limit.`);
      return;
    }

    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
          setError(
            `Image resolution too low (${img.width}×${img.height}). Minimum is ${MIN_DIMENSION}×${MIN_DIMENSION}px.`,
          );
          return;
        }
        setPreview(reader.result as string);
        setMode("review");
        onChange(selected, reader.result as string);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(selected);
  }

  function reset() {
    setPreview(null);
    setError(null);
    setMode("idle");
    onChange(null, null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-6">
        <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-50">
          {mode === "camera" ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-10 w-10 text-stone-300" />
          )}
        </div>

        <div className="flex-1 space-y-3">
          {mode === "idle" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <Camera className="h-4 w-4" />
                Use camera
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                <Upload className="h-4 w-4" />
                Upload file
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {mode === "camera" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={capture}
                className="inline-flex items-center gap-1.5 rounded-md bg-orange-700 px-3 py-2 text-sm font-medium text-white hover:bg-orange-800"
              >
                <Camera className="h-4 w-4" />
                Capture
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode("idle");
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          )}

          {mode === "review" && (
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                <Check className="h-4 w-4" />
                Photo ready
              </div>
              <button
                type="button"
                onClick={retake}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          )}

          <p className="text-xs text-stone-500">
            JPEG, PNG, or WebP. Max {(MAX_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB. Minimum{" "}
            {MIN_DIMENSION}×{MIN_DIMENSION}px.
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
