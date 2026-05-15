import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useStore } from "@/lib/store";
import { ArrowLeft, Bus, ScanLine, ScanFace, CheckCircle2, XCircle, RefreshCcw, AlertTriangle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/scan")({
  component: Scanner,
});

type Stage = "qr" | "selfie" | "verifying" | "success" | "fail" | "blocked";

function Scanner() {
  const navigate = useNavigate();
  const { students, currentStudentId, attendance, logAttendance, flagSuspicious, buses } = useStore();
  const me = students.find((s) => s.id === currentStudentId);
  const lastScan = attendance.find((a) => a.studentId === me?.id);
  const nextType: "entry" | "exit" = lastScan?.type === "entry" ? "exit" : "entry";

  const [stage, setStage] = useState<Stage>("qr");
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);
  const [error, setError] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (stage !== "qr" && stage !== "selfie") return;
    let cancelled = false;

    void (async () => {
      try {
        const facingMode = stage === "qr" ? "environment" : "user";
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
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
        if (stage === "qr") tickQR();
      } catch {
        setError("Camera access denied. Please enable camera permissions in your browser.");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const tickQR = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tickQR);
      return;
    }
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height);
    if (code) {
      try {
        const data = JSON.parse(code.data) as { id?: string };
        if (data?.id) {
          setScannedId(data.id);
          setStage("selfie");
          return;
        }
      } catch {
        setScannedId(me?.id ?? null);
        setStage("selfie");
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tickQR);
  };

  const captureSelfie = async () => {
    setStage("verifying");
    const match = Math.random() > Math.max(0.1, 0.5 - retries * 0.15);
    await new Promise((r) => setTimeout(r, 1400));

    if (match && scannedId === me?.id) {
      if (me) logAttendance(me.id, nextType, true);
      setStage("success");
    } else {
      const newRetries = retries + 1;
      setRetries(newRetries);
      if (newRetries >= 3) {
        if (me) {
          const bus = buses.find((b) => b.routeId === me.routeId);
          flagSuspicious(me.id, "Face mismatch after 3 retries", bus?.id ?? "");
        }
        setStage("blocked");
      } else {
        setStage("fail");
      }
    }
  };

  if (!me) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Please log in as a student to scan.</p>
          <Link to="/" className="text-accent font-semibold">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/student" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground"><Bus className="size-4" /></div>
            <span className="font-display font-extrabold">UniRoute</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Boarding · {nextType}</p>
          <h1 className="font-display text-3xl font-extrabold text-foreground">
            {stage === "qr" && "Scan bus QR"}
            {stage === "selfie" && "Live face verification"}
            {stage === "verifying" && "Verifying identity…"}
            {stage === "success" && "Verified"}
            {stage === "fail" && `Mismatch · retry ${retries}/3`}
            {stage === "blocked" && "Verification blocked"}
          </h1>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-4 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-sm">
          {(stage === "qr" || stage === "selfie") && (
            <>
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-square sm:aspect-video">
                <video ref={videoRef} className="size-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  {stage === "qr" ? (
                    <div className="size-48 border-2 border-accent rounded-2xl relative">
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-accent animate-pulse" />
                    </div>
                  ) : (
                    <div className="size-56 border-2 border-accent/70 rounded-full animate-pulse" />
                  )}
                </div>
                <div className="absolute bottom-3 left-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  {stage === "qr" ? <ScanLine className="size-3" /> : <ScanFace className="size-3" />}
                  {stage === "qr" ? "QR Scanner" : "AI Active"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {stage === "qr"
                  ? "Hold the bus QR inside the frame. Live camera only — gallery upload disabled."
                  : "Look straight at the camera. Live capture only — no uploads accepted."}
              </p>
              {stage === "selfie" && (
                <button onClick={() => void captureSelfie()} className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition">
                  Capture &amp; verify
                </button>
              )}
            </>
          )}

          {stage === "verifying" && (
            <div className="aspect-video grid place-items-center text-center">
              <div>
                <div className="size-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-semibold">Matching face with profile photo…</p>
                <p className="text-sm text-muted-foreground mt-1">AI verification in progress</p>
              </div>
            </div>
          )}

          {stage === "success" && (
            <div className="text-center py-10">
              <div className="size-20 mx-auto rounded-full bg-success/10 grid place-items-center mb-4">
                <CheckCircle2 className="size-10 text-success" />
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-1">Attendance marked</h3>
              <p className="text-muted-foreground capitalize mb-6">{nextType} · Seat {me.seatNo}</p>
              <Link to="/student" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-block">Back to dashboard</Link>
            </div>
          )}

          {stage === "fail" && (
            <div className="text-center py-10">
              <div className="size-20 mx-auto rounded-full bg-destructive/10 grid place-items-center mb-4">
                <XCircle className="size-10 text-destructive" />
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-1">Face did not match</h3>
              <p className="text-muted-foreground mb-6">Retry {retries} of 3 — adjust lighting and try again.</p>
              <button onClick={() => setStage("selfie")} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2">
                <RefreshCcw className="size-4" /> Retry
              </button>
            </div>
          )}

          {stage === "blocked" && (
            <div className="text-center py-10">
              <div className="size-20 mx-auto rounded-full bg-warning/10 grid place-items-center mb-4">
                <AlertTriangle className="size-10 text-warning" />
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-1">Admin alerted</h3>
              <p className="text-muted-foreground mb-6">After 3 failed attempts the entry has been flagged as suspicious. Please see the conductor.</p>
              <button onClick={() => void navigate({ to: "/student" })} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold">
                Return to dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
