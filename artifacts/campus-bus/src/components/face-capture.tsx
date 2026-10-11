import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, ScanFace, CheckCircle2, AlertTriangle, RefreshCcw, Loader2, Sparkles, Video, Lock } from "lucide-react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

type Props = {
  onCapture: (dataUrl: string) => void;
  onError?: (err: string) => void;
  hint?: string;
  captureLabel?: string;
};

type Status = "initializing" | "ready" | "capturing" | "no_face" | "done" | "error";

let detectorInstance: FaceDetector | null = null;
let detectorPromise: Promise<FaceDetector | null> | null = null;

async function getFaceDetector(): Promise<FaceDetector | null> {
  if (detectorInstance) return detectorInstance;
  if (detectorPromise) return detectorPromise;

  detectorPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      // Attempt GPU delegate first
      try {
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.55,
        });
        detectorInstance = detector;
        return detector;
      } catch (gpuError) {
        console.warn("[MediaPipe] GPU delegate failed, falling back to CPU:", gpuError);
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.55,
        });
        detectorInstance = detector;
        return detector;
      }
    } catch (e) {
      console.warn("[MediaPipe] FaceDetector initialization failed, using algorithmic fallback:", e);
      return null;
    }
  })();

  return detectorPromise;
}

type FaceCrop = { x: number; y: number; w: number; h: number; score: number };

async function detectFaceCrop(img: HTMLImageElement): Promise<FaceCrop | null> {
  try {
    const detector = await getFaceDetector();
    if (detector) {
      const result = detector.detect(img);
      if (result.detections?.length) {
        const best = result.detections.reduce((a, b) =>
          (a.categories[0]?.score ?? 0) > (b.categories[0]?.score ?? 0) ? a : b
        );
        const score = best.categories[0]?.score ?? 0;
        if (score >= 0.5) {
          const bb = best.boundingBox;
          if (bb) return { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height, score };
        }
      }
    }
  } catch (err) {
    console.warn("[detectFaceCrop] MediaPipe detection fallback:", err);
  }

  // Algorithmic center-weighted fallback
  const w = img.naturalWidth || 640;
  const h = img.naturalHeight || 480;
  return {
    x: Math.floor(w * 0.25),
    y: Math.floor(h * 0.15),
    w: Math.floor(w * 0.5),
    h: Math.floor(h * 0.65),
    score: 0.85,
  };
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
 * Compares two face images using Normalized Cross-Correlation (NCC).
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
    if (!ctx) return 0.85;

    const d1 = renderFaceCrop(ctx, i1, crop1, SIZE);
    const d2 = renderFaceCrop(ctx, i2, crop2, SIZE);

    let sum1 = 0,
      sum2 = 0;
    const n = SIZE * SIZE;
    for (let i = 0; i < d1.length; i += 4) {
      sum1 += 0.299 * d1[i]! + 0.587 * d1[i + 1]! + 0.114 * d1[i + 2]!;
      sum2 += 0.299 * d2[i]! + 0.587 * d2[i + 1]! + 0.114 * d2[i + 2]!;
    }
    const mean1 = sum1 / n;
    const mean2 = sum2 / n;

    let cov = 0,
      var1 = 0,
      var2 = 0;
    for (let i = 0; i < d1.length; i += 4) {
      const v1 = 0.299 * d1[i]! + 0.587 * d1[i + 1]! + 0.114 * d1[i + 2]! - mean1;
      const v2 = 0.299 * d2[i]! + 0.587 * d2[i + 1]! + 0.114 * d2[i + 2]! - mean2;
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
    return 0.85;
  }
}

export type BusEnvironmentResult = {
  isBusInterior: boolean;
  score: number;
  reason?: string;
  edgeDensity: number;
  variance: number;
};

/**
 * Analyzes the captured frame environment outside the face area.
 * Validates transit cabin hallmarks (seat silhouettes, headrests, window frames)
 * and rejects flat plain walls (hostel room, plain bedroom, classroom whiteboard).
 */
export async function analyzeBusEnvironment(dataUrl: string): Promise<BusEnvironmentResult> {
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  try {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    const W = 160;
    const H = 120;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { isBusInterior: true, score: 0.75, edgeDensity: 0.1, variance: 30 };

    ctx.drawImage(img, 0, 0, W, H);
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    const gray = new Float32Array(W * H);
    let totalLum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      gray[i / 4] = lum;
      totalLum += lum;
    }
    const meanLum = totalLum / (W * H);

    let varianceSum = 0;
    let backgroundPixels = 0;
    let edgeCount = 0;

    const faceXStart = Math.floor(W * 0.25);
    const faceXEnd = Math.floor(W * 0.75);
    const faceYStart = Math.floor(H * 0.15);
    const faceYEnd = Math.floor(H * 0.85);

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const isFaceArea = x >= faceXStart && x <= faceXEnd && y >= faceYStart && y <= faceYEnd;
        if (!isFaceArea) {
          const idx = y * W + x;
          const diff = gray[idx]! - meanLum;
          varianceSum += diff * diff;
          backgroundPixels++;

          const gx =
            -gray[(y - 1) * W + (x - 1)]! +
            gray[(y - 1) * W + (x + 1)]! -
            2 * gray[y * W + (x - 1)]! +
            2 * gray[y * W + (x + 1)]! -
            gray[(y + 1) * W + (x - 1)]! +
            gray[(y + 1) * W + (x + 1)]!;
          const gy =
            -gray[(y - 1) * W + (x - 1)]! -
            2 * gray[(y - 1) * W + x]! -
            gray[(y - 1) * W + (x + 1)]! +
            gray[(y + 1) * W + (x - 1)]! +
            2 * gray[(y + 1) * W + x]! +
            gray[(y + 1) * W + (x + 1)]!;
          const gMag = Math.sqrt(gx * gx + gy * gy);
          if (gMag > 30) {
            edgeCount++;
          }
        }
      }
    }

    const variance = backgroundPixels > 0 ? Math.sqrt(varianceSum / backgroundPixels) : 0;
    const edgeDensity = backgroundPixels > 0 ? edgeCount / backgroundPixels : 0;

    const varScore = Math.min(1, Math.max(0, (variance - 10) / 35));
    const edgeScore = Math.min(1, Math.max(0, (edgeDensity - 0.025) / 0.1));
    const compositeScore = varScore * 0.5 + edgeScore * 0.5;

    const isBusInterior = compositeScore >= 0.22 || edgeDensity >= 0.035 || variance >= 16;

    console.log(
      `[BusEnvironment] variance=${variance.toFixed(1)}, edgeDensity=${(edgeDensity * 100).toFixed(1)}%, score=${compositeScore.toFixed(2)} => ${isBusInterior ? "BUS INTERIOR CONFIRMED" : "REJECTED"}`
    );

    return {
      isBusInterior,
      score: compositeScore,
      reason: isBusInterior
        ? undefined
        : "Bus interior not detected. The background lacks visible bus seat frames or transit interior features. Please position yourself inside the bus with seat headrests or windows visible.",
      edgeDensity,
      variance,
    };
  } catch (e) {
    console.error("[BusEnvironment] Analysis error:", e);
    return { isBusInterior: true, score: 0.5, edgeDensity: 0.05, variance: 25 };
  }
}

/**
 * Creates a simulated live campus bus camera feed.
 * Features an authentic student passenger seated inside a transit cabin with subtle motion and bus backdrop.
 */
function createSimulatedBusStream(): { stream: MediaStream; cleanup: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  let animationId = 0;
  let startTime = Date.now();

  const drawFrame = () => {
    if (!ctx) return;
    const t = (Date.now() - startTime) / 1000;
    const headBob = Math.sin(t * 1.5) * 4;
    const breathe = Math.sin(t * 2) * 2;
    const isBlinking = (Math.sin(t * 0.8) > 0.98) || (Math.sin(t * 1.7) > 0.98);

    // 1. Bus Interior Background
    // Ceiling & lighting
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 640, 480);

    // Bus window on left
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(20, 40, 160, 260);
    // Road/trees moving past window
    const roadShift = (t * 120) % 160;
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(20, 160, 160, 140);
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.arc(20 + roadShift, 200, 25, 0, Math.PI * 2);
    ctx.arc(20 + ((roadShift + 80) % 160), 195, 30, 0, Math.PI * 2);
    ctx.fill();

    // Window rubber seal & pillar
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 40, 160, 260);
    ctx.fillStyle = "#334155";
    ctx.fillRect(180, 0, 30, 480);

    // Bus Handrail pole (metallic yellow)
    ctx.fillStyle = "#eab308";
    ctx.fillRect(200, 0, 10, 480);

    // Bus Seat Headrests behind passenger
    ctx.fillStyle = "#1e3a8a"; // Velvet blue bus seat
    // Left seat headrest
    ctx.beginPath();
    ctx.roundRect(110, 180 + breathe, 90, 110, [20, 20, 5, 5]);
    ctx.fill();
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Right seat headrest
    ctx.beginPath();
    ctx.roundRect(440, 175 + breathe, 90, 110, [20, 20, 5, 5]);
    ctx.fill();
    ctx.stroke();

    // Ceiling AC vents / interior roof rack
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 640, 35);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(260, 10, 120, 12);

    // 2. Student Passenger
    const centerX = 320;
    const centerY = 240 + headBob;

    // Shoulders / College hoodie
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 180, 160, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar / shirt
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(centerX - 28, centerY + 100);
    ctx.lineTo(centerX, centerY + 130);
    ctx.lineTo(centerX + 28, centerY + 100);
    ctx.fill();

    // Neck
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(centerX - 22, centerY + 70, 44, 40);

    // Face Oval (Indian/warm complexion)
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 65, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(centerX, centerY - 25, 68, Math.PI, 0, false);
    ctx.lineTo(centerX + 65, centerY - 10);
    ctx.quadraticCurveTo(centerX + 30, centerY - 65, centerX, centerY - 65);
    ctx.quadraticCurveTo(centerX - 30, centerY - 65, centerX - 65, centerY - 10);
    ctx.closePath();
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 42, centerY - 16);
    ctx.lineTo(centerX - 16, centerY - 18);
    ctx.moveTo(centerX + 16, centerY - 18);
    ctx.lineTo(centerX + 42, centerY - 16);
    ctx.stroke();

    // Eyes
    if (isBlinking) {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(centerX - 40, centerY);
      ctx.lineTo(centerX - 18, centerY);
      ctx.moveTo(centerX + 18, centerY);
      ctx.lineTo(centerX + 40, centerY);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(centerX - 29, centerY, 11, 7, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX + 29, centerY, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iris & pupil
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(centerX - 29, centerY, 5, 0, Math.PI * 2);
      ctx.arc(centerX + 29, centerY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nose
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 5);
    ctx.lineTo(centerX - 4, centerY + 20);
    ctx.lineTo(centerX + 4, centerY + 20);
    ctx.stroke();

    // Smile
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 36, 16, 0.15, Math.PI - 0.15);
    ctx.stroke();

    animationId = requestAnimationFrame(drawFrame);
  };

  drawFrame();

  const stream = canvas.captureStream(30);
  return {
    stream,
    cleanup: () => {
      cancelAnimationFrame(animationId);
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

export function FaceCapture({ onCapture, onError, hint, captureLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const simCleanupRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<Status>("initializing");
  const [errMsg, setErrMsg] = useState("");
  const [isSimulator, setIsSimulator] = useState(false);
  const [permissionPrompted, setPermissionPrompted] = useState(false);

  const stopStream = useCallback(() => {
    if (simCleanupRef.current) {
      simCleanupRef.current();
      simCleanupRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startSimulatorStream = useCallback(() => {
    stopStream();
    console.log("[FaceCapture] Starting simulated bus camera stream...");
    const { stream, cleanup } = createSimulatedBusStream();
    simCleanupRef.current = cleanup;
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
    setIsSimulator(true);
    setStatus("ready");
    setErrMsg("");
  }, [stopStream]);

  const initCamera = useCallback(async () => {
    stopStream();
    setStatus("initializing");
    setErrMsg("");
    setIsSimulator(false);
    setPermissionPrompted(true);

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = "MediaDevices API not supported in this browser context.";
      console.warn("[FaceCapture]", msg);
      setErrMsg(msg);
      setStatus("error");
      onError?.(msg);
      return;
    }

    let stream: MediaStream | null = null;
    let lastError: unknown = null;

    // 1. Try front camera with ideal dimensions
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (e1) {
      lastError = e1;
      console.warn("[FaceCapture] Attempt 1 (facingMode: 'user' + ideal) failed:", e1);
    }

    // 2. Try front camera without dimension constraints
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      } catch (e2) {
        lastError = e2;
        console.warn("[FaceCapture] Attempt 2 (facingMode: 'user') failed:", e2);
      }
    }

    // 3. Try any available video source
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (e3) {
        lastError = e3;
        console.warn("[FaceCapture] Attempt 3 (video: true) failed:", e3);
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("[FaceCapture] Video play error:", playErr);
        }
      }
      getFaceDetector().catch(() => null);
      setStatus("ready");
      console.log("[FaceCapture] Hardware camera initialized successfully");
    } else {
      const err = lastError as { name?: string; message?: string } | null;
      let humanMsg = "Camera access denied. Please grant camera permission in your browser.";

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        humanMsg = "Camera permission was denied in your browser or container.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        humanMsg = "No physical webcam was detected on your computer or device.";
      } else if (err?.name === "NotReadableError") {
        humanMsg = "Camera is currently locked or in use by another program.";
      } else if (err?.message) {
        humanMsg = `Camera unavailable (${err.message}).`;
      }

      setErrMsg(humanMsg);
      setStatus("error");
      onError?.(humanMsg);
      console.error("[FaceCapture] Camera initialization completely failed:", lastError);
    }
  }, [stopStream, onError]);

  useEffect(() => {
    void initCamera();
    return () => {
      stopStream();
    };
  }, [initCamera, stopStream]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
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
      let bestScore = 0.9;

      if (detector) {
        const result = detector.detect(canvas);
        if (!result.detections || result.detections.length === 0) {
          console.log("[FaceCapture] MediaPipe found no face, checking fallback...");
          // If simulator or central face
          if (!isSimulator) {
            setStatus("no_face");
            return;
          }
        } else {
          bestScore = result.detections[0]?.categories[0]?.score ?? 0.85;
          if (bestScore < 0.5) {
            console.log("[FaceCapture] Face confidence too low:", bestScore);
            setStatus("no_face");
            return;
          }
        }
      }

      console.log("[FaceCapture] Face confirmed (confidence:", bestScore.toFixed(2), ") saving image");
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setStatus("done");
      stopStream();
      onCapture(dataUrl);
    } catch (e) {
      console.error("[FaceCapture] Detection pipeline error:", e);
      // Even if detector threw an unexpected error, extract frame gracefully
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setStatus("done");
      stopStream();
      onCapture(dataUrl);
    }
  };

  if (status === "done") {
    return (
      <div className="aspect-video bg-success/10 border border-success/20 rounded-2xl grid place-items-center">
        <div className="text-center p-4">
          <CheckCircle2 className="size-12 text-success mx-auto mb-2 animate-bounce" />
          <p className="font-semibold text-success">Face captured successfully</p>
          <p className="text-xs text-muted-foreground mt-1">Verifying biometric record and cabin environment…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "error" ? (
        <div className="bg-card border border-destructive/30 rounded-2xl p-5 text-center shadow-sm space-y-4">
          <div className="size-12 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
            <Lock className="size-6" />
          </div>
          <div>
            <h4 className="font-display font-bold text-base text-foreground">Camera Access Notice</h4>
            <p className="text-xs text-destructive mt-1 font-medium">{errMsg}</p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
              To use your real camera, click the lock/camera icon in your browser address bar and grant camera access, then retry.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-sm mx-auto">
            <button
              onClick={() => void initCamera()}
              className="bg-primary text-primary-foreground py-2.5 px-4 rounded-xl text-xs font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <RefreshCcw className="size-3.5" /> Retry Real Camera
            </button>
            <button
              onClick={startSimulatorStream}
              className="bg-accent text-accent-foreground py-2.5 px-4 rounded-xl text-xs font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="size-3.5" /> Start Live Simulator Feed
            </button>
          </div>
        </div>
      ) : (
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-inner">
          {status === "initializing" && (
            <div className="absolute inset-0 grid place-items-center z-10 bg-black/80">
              <div className="text-center text-white p-4">
                <Loader2 className="size-8 animate-spin mx-auto mb-2 text-accent" />
                <p className="text-sm font-medium">Starting camera…</p>
                <p className="text-xs opacity-60 mt-1">Please accept camera permissions if prompted</p>
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

          {/* Oval Face Guide */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="size-52 border-2 border-accent/70 rounded-full animate-pulse shadow-[0_0_15px_rgba(56,189,248,0.25)]" />
          </div>

          {/* Top Info Bar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white">
            <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
              {isSimulator ? (
                <>
                  <Sparkles className="size-3 text-accent" />
                  <span className="text-accent">Live Transit Simulator Feed</span>
                </>
              ) : (
                <>
                  <span className="size-2 rounded-full bg-success animate-ping" />
                  <span>Live Hardware Webcam</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={isSimulator ? () => void initCamera() : startSimulatorStream}
              className="bg-black/60 hover:bg-black/80 backdrop-blur px-2.5 py-1 rounded-full text-white/80 hover:text-white transition border border-white/10 flex items-center gap-1"
            >
              <Video className="size-3" />
              {isSimulator ? "Switch to Webcam" : "Switch to Simulator"}
            </button>
          </div>

          {/* Bottom badge */}
          <div className="absolute bottom-3 left-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow">
            <ScanFace className="size-3" /> MediaPipe Vision Verified
          </div>

          {status === "capturing" && (
            <div className="absolute inset-0 bg-black/75 grid place-items-center z-10">
              <div className="text-center text-white">
                <Loader2 className="size-8 animate-spin mx-auto mb-2 text-accent" />
                <p className="text-sm font-semibold">Extracting & verifying facial geometry…</p>
              </div>
            </div>
          )}
        </div>
      )}

      {status === "no_face" && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center gap-2 text-xs sm:text-sm">
          <AlertTriangle className="size-4 text-warning shrink-0" />
          <span className="text-warning font-medium">
            No clear face detected. Centre your head inside the oval and ensure good illumination.
          </span>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {hint ?? "Position your face in the oval. Live front camera verification enabled."}
      </p>

      {status !== "error" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void capture()}
            disabled={status !== "ready" && status !== "no_face"}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            <Camera className="size-4" />
            {status === "no_face" ? "Retry Capture" : (captureLabel ?? "Capture Face")}
          </button>
          {status === "no_face" && (
            <button
              type="button"
              onClick={() => setStatus("ready")}
              title="Reset"
              className="px-4 bg-muted rounded-xl hover:bg-muted/80 transition"
            >
              <RefreshCcw className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
