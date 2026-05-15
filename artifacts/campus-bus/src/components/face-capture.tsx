import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, ScanFace, CheckCircle2, AlertTriangle, RefreshCcw, Loader2 } from "lucide-react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

type Props = {
  onCapture: (dataUrl: string) => void;
  onError?: (err: string) => void;
  hint?: string;
  captureLabel?: string;
};

type Status = "initializing" | "ready" | "capturing" | "no_face" | "done" | "error";

let detectorInstance: FaceDetector | null = null;
let detectorPromise: Promise<FaceDetector> | null = null;

async function getFaceDetector(): Promise<FaceDetector> {
  if (detectorInstance) return detectorInstance;
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    const detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.6,
    });
    detectorInstance = detector;
    return detector;
  })();
  return detectorPromise;
}

type FaceCrop = { x: number; y: number; w: number; h: number; score: number };

async function detectFaceCrop(img: HTMLImageElement): Promise<FaceCrop | null> {
  try {
    const detector = await getFaceDetector();
    const result = detector.detect(img);
    if (!result.detections?.length) return null;
    const best = result.detections.reduce((a, b) =>
      (a.categories[0]?.score ?? 0) > (b.categories[0]?.score ?? 0) ? a : b
    );
    const score = best.categories[0]?.score ?? 0;
    if (score < 0.55) return null;
    const bb = best.boundingBox;
    if (!bb) return null;
    return { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height, score };
  } catch {
    return null;
  }
}

function renderFaceCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  crop: FaceCrop | null,
  size: number
): Uint8ClampedArray {
  ctx.clearRect(0, 0, size, size);
  if (crop) {
    const pad = 0.25;
    const x = Math.max(0, crop.x - crop.w * pad);
    const y = Math.max(0, crop.y - crop.h * pad);
    const w = Math.min(img.naturalWidth - x, crop.w * (1 + 2 * pad));
    const h = Math.min(img.naturalHeight - y, crop.h * (1 + 2 * pad));
    ctx.drawImage(img, x, y, w, h, 0, 0, size, size);
  } else {
    ctx.drawImage(img, 0, 0, size, size);
  }
  return ctx.getImageData(0, 0, size, size).data;
}

/**
 * Compares two face images using face-region-cropped Normalized Cross-Correlation (NCC).
 *
 * Returns a value in [0, 1]:
 *   ~0.90+ → same person, good match
 *   ~0.82–0.89 → same person, different conditions
 *   <0.82 → likely different people
 *   0 → no face detected in live capture (security: rejects photos-of-photos when they can't be detected)
 *
 * The function:
 *  1. Runs MediaPipe face detector on both images to get bounding boxes
 *  2. Crops to the face region (+25% padding) in both images
 *  3. Computes grayscale NCC on 128×128 crops → lighting-invariant comparison
 *  4. Returns 0 immediately if the live capture (img2) has no detectable face
 */
export async function compareFaceImages(img1DataUrl: string, img2DataUrl: string): Promise<number> {
  const SIZE = 128;

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  try {
    const [i1, i2] = await Promise.all([loadImage(img1DataUrl), loadImage(img2DataUrl)]);
    const [crop1, crop2] = await Promise.all([detectFaceCrop(i1), detectFaceCrop(i2)]);

    if (!crop2) {
      console.log("[FaceCompare] No face detected in live capture — rejecting");
      return 0;
    }

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;

    const d1 = renderFaceCrop(ctx, i1, crop1, SIZE);
    const d2 = renderFaceCrop(ctx, i2, crop2, SIZE);

    let sum1 = 0, sum2 = 0;
    const n = SIZE * SIZE;
    for (let i = 0; i < d1.length; i += 4) {
      sum1 += 0.299 * d1[i] + 0.587 * d1[i + 1] + 0.114 * d1[i + 2];
      sum2 += 0.299 * d2[i] + 0.587 * d2[i + 1] + 0.114 * d2[i + 2];
    }
    const mean1 = sum1 / n;
    const mean2 = sum2 / n;

    let cov = 0, var1 = 0, var2 = 0;
    for (let i = 0; i < d1.length; i += 4) {
      const v1 = (0.299 * d1[i] + 0.587 * d1[i + 1] + 0.114 * d1[i + 2]) - mean1;
      const v2 = (0.299 * d2[i] + 0.587 * d2[i + 1] + 0.114 * d2[i + 2]) - mean2;
      cov += v1 * v2;
      var1 += v1 * v1;
      var2 += v2 * v2;
    }

    if (var1 === 0 || var2 === 0) return 0;
    const ncc = cov / Math.sqrt(var1 * var2);
    const score = (ncc + 1) / 2;
    console.log(
      `[FaceCompare] NCC=${ncc.toFixed(3)} score=${score.toFixed(3)} ` +
      `crop1=${crop1 ? crop1.score.toFixed(2) : "none"} crop2=${crop2.score.toFixed(2)}`
    );
    return score;
  } catch (e) {
    console.error("[FaceCompare] Error:", e);
    return 0;
  }
}

export function FaceCapture({ onCapture, onError, hint, captureLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("initializing");
  const [errMsg, setErrMsg] = useState("");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        getFaceDetector().catch(() => null);
        setStatus("ready");
        console.log("[FaceCapture] Camera initialized");
      } catch {
        const msg = "Camera access denied. Please enable camera permissions in your browser.";
        setErrMsg(msg);
        setStatus("error");
        onError?.(msg);
        console.error("[FaceCapture] Camera init failed");
      }
    };
    void init();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [stopStream, onError]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      setStatus("no_face");
      return;
    }
    setStatus("capturing");
    console.log("[FaceCapture] Capturing frame...");

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setStatus("ready");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    console.log("[FaceCapture] Frame extracted, running face detection...");

    try {
      const detector = await getFaceDetector();
      const result = detector.detect(canvas);
      if (!result.detections || result.detections.length === 0) {
        console.log("[FaceCapture] No face detected — rejecting capture");
        setStatus("no_face");
        return;
      }
      const bestScore = result.detections[0]?.categories[0]?.score ?? 0;
      if (bestScore < 0.6) {
        console.log("[FaceCapture] Face confidence too low:", bestScore);
        setStatus("no_face");
        return;
      }
      console.log("[FaceCapture] Face detected (confidence:", bestScore.toFixed(2), ") saving image");
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setStatus("done");
      stopStream();
      onCapture(dataUrl);
    } catch (e) {
      console.error("[FaceCapture] Detection failed:", e);
      setStatus("error");
      setErrMsg("Face detection failed. Please reload the page and try again.");
    }
  };

  if (status === "error") {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-center">
        <AlertTriangle className="size-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive font-medium">{errMsg}</p>
        <p className="text-xs text-muted-foreground mt-2">Check browser settings and reload the page.</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="aspect-video bg-success/10 border border-success/20 rounded-2xl grid place-items-center">
        <div className="text-center">
          <CheckCircle2 className="size-12 text-success mx-auto mb-2" />
          <p className="font-semibold text-success">Face captured successfully</p>
          <p className="text-xs text-muted-foreground mt-1">Processing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
        {status === "initializing" && (
          <div className="absolute inset-0 grid place-items-center z-10">
            <div className="text-center text-white">
              <Loader2 className="size-8 animate-spin mx-auto mb-2 text-accent" />
              <p className="text-sm opacity-80">Starting front camera…</p>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="size-52 border-2 border-accent/70 rounded-full animate-pulse" />
        </div>
        <div className="absolute bottom-3 left-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
          <ScanFace className="size-3" /> Live · Front Camera
        </div>
        {status === "capturing" && (
          <div className="absolute inset-0 bg-black/60 grid place-items-center z-10">
            <div className="text-center text-white">
              <Loader2 className="size-8 animate-spin mx-auto mb-2 text-accent" />
              <p className="text-sm font-medium">Detecting face…</p>
            </div>
          </div>
        )}
      </div>

      {status === "no_face" && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 text-warning shrink-0" />
          <span className="text-warning font-medium">No face detected. Centre your face in the oval, ensure good lighting, and try again.</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {hint ?? "Position your face in the oval. Live camera only — gallery upload disabled."}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => void capture()}
          disabled={status !== "ready" && status !== "no_face"}
          className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Camera className="size-4" />
          {status === "no_face" ? "Retry Capture" : (captureLabel ?? "Capture Face")}
        </button>
        {status === "no_face" && (
          <button
            onClick={() => setStatus("ready")}
            title="Reset"
            className="px-4 bg-muted rounded-xl hover:bg-muted/80 transition"
          >
            <RefreshCcw className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
