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
      minDetectionConfidence: 0.5,
    });
    detectorInstance = detector;
    return detector;
  })();
  return detectorPromise;
}

export async function compareFaceImages(img1DataUrl: string, img2DataUrl: string): Promise<number> {
  const SIZE = 48;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  try {
    const i1 = await loadImage(img1DataUrl);
    ctx.drawImage(i1, 0, 0, SIZE, SIZE);
    const d1 = ctx.getImageData(0, 0, SIZE, SIZE).data;

    const i2 = await loadImage(img2DataUrl);
    ctx.drawImage(i2, 0, 0, SIZE, SIZE);
    const d2 = ctx.getImageData(0, 0, SIZE, SIZE).data;

    let diff = 0;
    for (let i = 0; i < d1.length; i += 4) {
      diff += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]);
    }
    const maxDiff = SIZE * SIZE * 3 * 255;
    return 1 - diff / maxDiff;
  } catch {
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
        console.log("[FaceCapture] No face detected in frame");
        setStatus("no_face");
        return;
      }
      console.log("[FaceCapture] Face detected, saving image");
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setStatus("done");
      stopStream();
      onCapture(dataUrl);
    } catch (e) {
      console.warn("[FaceCapture] Detector error, proceeding with capture anyway:", e);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      if (dataUrl.length > 1000) {
        setStatus("done");
        stopStream();
        onCapture(dataUrl);
      } else {
        setStatus("no_face");
      }
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
          <span className="text-warning font-medium">No face detected. Centre your face in the oval and try again.</span>
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
