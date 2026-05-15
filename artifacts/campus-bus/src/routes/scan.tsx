import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ArrowLeft, Bus, ScanFace, CheckCircle2, XCircle, RefreshCcw, AlertTriangle, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FaceCapture, compareFaceImages } from "@/components/face-capture";

export const Route = createFileRoute("/scan")({
  component: Scanner,
});

type Stage = "camera" | "verifying" | "success" | "fail" | "blocked" | "unpaid";

function Scanner() {
  const navigate = useNavigate();
  const { students, currentStudentId, attendance, logAttendance, flagSuspicious, buses, routes } = useStore();
  const me = students.find((s) => s.id === currentStudentId);
  const route = routes.find((r) => r.id === me?.routeId);
  const lastAttendance = attendance.find((a) => a.studentId === me?.id);
  const nextType: "entry" | "exit" = lastAttendance?.type === "entry" ? "exit" : "entry";

  const [stage, setStage] = useState<Stage>(() => {
    if (me && !me.feesPaid) return "unpaid";
    return "camera";
  });
  const [retries, setRetries] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  if (!me) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Please log in as a student to use this feature.</p>
          <Link to="/" className="text-accent font-semibold">Go home</Link>
        </div>
      </div>
    );
  }

  const handleCapture = async (dataUrl: string) => {
    setCapturedImage(dataUrl);
    setStage("verifying");
    console.log("[Scanner] Verification started for student:", me.id);

    let matched = false;
    try {
      if (me.photo && me.photo.startsWith("data:")) {
        const similarity = await compareFaceImages(me.photo, dataUrl);
        console.log("[Scanner] Face similarity score:", similarity.toFixed(3));
        matched = similarity > 0.72;
      } else {
        await new Promise((r) => setTimeout(r, 800));
        matched = true;
        console.log("[Scanner] No registered photo — attendance granted (no-photo mode)");
      }
    } catch (e) {
      console.error("[Scanner] Comparison error:", e);
      matched = false;
    }

    if (matched) {
      logAttendance(me.id, nextType, true);
      setStage("success");
      console.log("[Scanner] Attendance marked:", nextType);
    } else {
      const newRetries = retries + 1;
      setRetries(newRetries);
      console.log("[Scanner] Face mismatch. Retries:", newRetries);
      if (newRetries >= 3) {
        const bus = buses.find((b) => b.routeId === me.routeId);
        flagSuspicious(me.id, "Face mismatch after 3 retries", bus?.id ?? "", dataUrl, me.seatNo);
        setStage("blocked");
        console.log("[Scanner] Suspicious entry flagged");
      } else {
        setStage("fail");
      }
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setStage("camera");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/student" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Bus className="size-4" />
            </div>
            <span className="font-display font-extrabold">UniRoute</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Boarding · {nextType}
          </p>
          <h1 className="font-display text-3xl font-extrabold text-foreground">
            {stage === "camera" && "Face verification"}
            {stage === "verifying" && "Verifying identity…"}
            {stage === "success" && "Verified"}
            {stage === "fail" && `Mismatch · retry ${retries}/3`}
            {stage === "blocked" && "Verification blocked"}
            {stage === "unpaid" && "Payment required"}
          </h1>
        </div>

        <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-sm">
          {stage === "camera" && (
            <FaceCapture
              onCapture={(dataUrl) => void handleCapture(dataUrl)}
              hint="Look straight at the camera. Live capture only — no uploads accepted."
              captureLabel="Capture & Verify"
            />
          )}

          {stage === "verifying" && (
            <div className="aspect-video grid place-items-center text-center">
              <div>
                <div className="size-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-semibold">Matching face with registered profile…</p>
                <p className="text-sm text-muted-foreground mt-1">Face verification in progress</p>
              </div>
            </div>
          )}

          {stage === "success" && (
            <div className="text-center py-10">
              <div className="size-20 mx-auto rounded-full bg-success/10 grid place-items-center mb-4">
                <CheckCircle2 className="size-10 text-success" />
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-1">Attendance marked</h3>
              <p className="text-muted-foreground capitalize mb-2">
                {nextType} · Seat {me.seatNo}
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                {route?.name} · {new Date().toLocaleTimeString()}
              </p>
              <Link
                to="/student"
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-block"
              >
                Back to dashboard
              </Link>
            </div>
          )}

          {stage === "fail" && (
            <div className="text-center py-10">
              <div className="size-20 mx-auto rounded-full bg-destructive/10 grid place-items-center mb-4">
                <XCircle className="size-10 text-destructive" />
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-1">Face did not match</h3>
              <p className="text-muted-foreground mb-2">Retry {retries} of 3</p>
              <p className="text-sm text-muted-foreground mb-6">
                Ensure good lighting and look directly at the camera.
              </p>
              {capturedImage && (
                <div className="mb-6 flex justify-center">
                  <img src={capturedImage} alt="Captured" className="size-24 rounded-xl object-cover border border-border" />
                </div>
              )}
              <button
                onClick={reset}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2"
              >
                <RefreshCcw className="size-4" /> Retry verification
              </button>
            </div>
          )}

          {stage === "blocked" && (
            <div className="text-center py-10">
              <div className="size-20 mx-auto rounded-full bg-warning/10 grid place-items-center mb-4">
                <AlertTriangle className="size-10 text-warning" />
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-1">Entry blocked</h3>
              <p className="text-muted-foreground mb-2">
                After 3 failed face matches, this entry has been flagged as suspicious.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Admin and conductor have been notified. Please see your conductor for manual override.
              </p>
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-sm text-warning text-left mb-6">
                <ScanFace className="size-4 inline mr-2" />
                If you are the genuine student, the conductor can approve your entry manually from the conductor dashboard.
              </div>
              <button
                onClick={() => void navigate({ to: "/student" })}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold"
              >
                Return to dashboard
              </button>
            </div>
          )}

          {stage === "unpaid" && (
            <div className="text-center py-10">
              <div className="size-20 mx-auto rounded-full bg-destructive/10 grid place-items-center mb-4">
                <Wallet className="size-10 text-destructive" />
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-1">Fees not paid</h3>
              <p className="text-muted-foreground mb-6">
                Semester fees of ₹{route?.fare ?? 0} must be paid before using the boarding system.
              </p>
              <Link
                to="/student"
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-block"
              >
                Go to dashboard to pay
              </Link>
            </div>
          )}
        </div>

        {(stage === "camera" || stage === "fail") && (
          <div className="mt-4 bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm">{me.name} · {me.rollNo}</p>
            <p>Seat {me.seatNo} · {route?.name?.split("—")[0].trim() ?? "—"}</p>
            <p>Pickup: {me.pickupPoint}</p>
          </div>
        )}
      </main>
    </div>
  );
}
