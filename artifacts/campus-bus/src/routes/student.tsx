import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { SeatGrid } from "@/components/seat-grid";
import { StatCard } from "@/components/stat-card";
import { FaceCapture, compareFaceImages, analyzeBusEnvironment } from "@/components/face-capture";
import {
  Bus, Wallet, History, Armchair, ScanFace, MapPin,
  CheckCircle2, XCircle, ShieldCheck, AlertTriangle,
  RefreshCcw, X, Play, StopCircle, UserX, Clock,
} from "lucide-react";

export const Route = createFileRoute("/student")({
  component: StudentPage,
});

type TripStage = "capture" | "verifying" | "success" | "fail" | "blocked" | "no_photo" | "no_active_trip" | "env_fail";

function StudentPage() {
  const { students, currentStudentId, routes, attendance, payments, payFees, buses, trips, logAttendance, flagSuspicious, suspicious } = useStore();
  const me = students.find((s) => s.id === currentStudentId) ?? students[0];
  const route = routes.find((r) => r.id === me?.routeId);
  const myBus = buses.find((b) => b.routeId === me?.routeId);
  const activeTrip = myBus ? trips.find((t) => t.busId === myBus.id && t.status === "active") : null;
  const myAttendance = attendance.filter((a) => a.studentId === me?.id);
  const myPayments = payments.filter((p) => p.studentId === me?.id);
  const lastEntry = [...myAttendance].filter((a) => a.type === "entry").sort((a, b) => b.ts - a.ts)[0];
  const lastExit = [...myAttendance].filter((a) => a.type === "exit").sort((a, b) => b.ts - a.ts)[0];
  const isInBus = lastEntry && (!lastExit || lastEntry.ts > lastExit.ts);
  const attRate =
    myAttendance.length === 0
      ? 0
      : Math.round((myAttendance.filter((a) => a.verified || a.conductorOverride).length / myAttendance.length) * 100);

  const [tripModal, setTripModal] = useState<"entry" | "exit" | null>(null);
  const [tripStage, setTripStage] = useState<TripStage>("capture");
  const [tripRetries, setTripRetries] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [envReason, setEnvReason] = useState<string>("");

  const openTrip = (type: "entry" | "exit") => {
    if (!me?.feesPaid) return;
    setTripModal(type);
    setTripRetries(0);
    setLastScore(null);
    setEnvReason("");

    if (!activeTrip) {
      setTripStage("no_active_trip");
    } else if (!me.photo || !me.photo.startsWith("data:")) {
      setTripStage("no_photo");
    } else {
      setTripStage("capture");
    }
  };

  const closeTrip = () => {
    setTripModal(null);
    setTripStage("capture");
    setTripRetries(0);
    setLastScore(null);
    setEnvReason("");
  };

  const handleTripCapture = async (dataUrl: string) => {
    if (!me || !tripModal) return;
    setTripStage("verifying");
    console.log("[Student] Starting verification for:", tripModal);

    // 1. Bus environment verification (Anti-Remote Selfie Fraud)
    try {
      const envCheck = await analyzeBusEnvironment(dataUrl);
      console.log("[Student] Bus environment analysis result:", envCheck);
      if (!envCheck.isBusInterior) {
        console.warn("[Student] Rejected: Non-bus environment detected");
        setEnvReason(envCheck.reason || "Bus cabin / seating features not detected.");
        const suspId = "x_env_" + Date.now();
        const reasonText = `Bus environment check failed: Remote selfie / non-bus location suspected during ${tripModal}`;
        flagSuspicious(me.id, reasonText, myBus?.id ?? "", dataUrl, me.seatNo);
        api.suspicious.flag({
          id: suspId,
          studentId: me.id,
          reason: reasonText,
          ts: Date.now(),
          busId: myBus?.id ?? "",
          capturedImage: dataUrl,
          seatNo: me.seatNo,
        }).catch(console.error);
        setTripStage("env_fail");
        return;
      }
    } catch (err) {
      console.error("[Student] Bus environment check error:", err);
    }

    // 2. Face comparison
    let matched = false;
    let score = 0;

    try {
      if (me.photo && me.photo.startsWith("data:")) {
        score = await compareFaceImages(me.photo, dataUrl);
        setLastScore(score);
        console.log(`[Student] Face score=${score.toFixed(3)} threshold=0.82`);
        matched = score >= 0.82;
      } else {
        setTripStage("no_photo");
        return;
      }
    } catch (e) {
      console.error("[Student] Comparison error:", e);
      matched = false;
    }

    if (matched) {
      const attendanceId = "a_" + Date.now();
      logAttendance(me.id, tripModal, true);
      api.attendance.log({
        id: attendanceId,
        studentId: me.id,
        type: tripModal,
        ts: Date.now(),
        busId: myBus?.id ?? "",
        verified: true,
      }).catch(console.error);
      console.log(`[Student] Attendance marked: ${tripModal}`);
      setTripStage("success");
    } else {
      const newRetries = tripRetries + 1;
      setTripRetries(newRetries);
      console.log(`[Student] Face mismatch (score=${score.toFixed(3)}), retry ${newRetries}/3`);
      if (newRetries >= 3) {
        const suspId = "x_" + Date.now();
        flagSuspicious(me.id, "Face mismatch after 3 retries", myBus?.id ?? "", dataUrl, me.seatNo);
        api.suspicious.flag({
          id: suspId,
          studentId: me.id,
          reason: "Face mismatch after 3 retries",
          ts: Date.now(),
          busId: myBus?.id ?? "",
          capturedImage: dataUrl,
          seatNo: me.seatNo,
        }).catch(console.error);
        setTripStage("blocked");
      } else {
        setTripStage("fail");
      }
    }
  };

  const handlePayFees = () => {
    if (!me || !route) return;
    const paymentId = "p_" + Date.now();
    payFees(me.id, route.fare);
    api.payments.pay(paymentId, me.id, route.fare, Date.now()).catch(console.error);
  };

  if (!me) return null;

  const nav = [
    { to: "/student", label: "Dashboard", icon: <Bus className="size-3.5" /> },
  ];

  return (
    <AppShell nav={nav} title="Student Portal">
      <div className="grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
            <div className="w-full aspect-square rounded-2xl bg-muted overflow-hidden mb-5">
              {me.photo ? (
                <img src={me.photo} alt={me.name} className="size-full object-cover" />
              ) : (
                <div className="size-full grid place-items-center text-muted-foreground text-xs uppercase tracking-widest">No Photo</div>
              )}
            </div>
            <h2 className="font-display text-xl font-extrabold text-foreground">{me.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Roll: {me.rollNo} · {me.branch} Sem {me.semester}</p>
            <div className="space-y-2.5">
              <Row label="Route" value={route?.name.split("—")[0].trim() ?? "—"} />
              <Row label="Pickup" value={me.pickupPoint} icon={<MapPin className="size-3.5" />} />
              <Row label="Phone" value={me.phone} />
              <Row label="Parent" value={me.parentPhone} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Bus Boarding</p>

            {/* Trip status indicator */}
            <div className={`flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-medium ${activeTrip ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {activeTrip ? <Play className="size-3.5 fill-current" /> : <Clock className="size-3.5" />}
              {activeTrip ? `Trip active · started ${new Date(activeTrip.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No active trip"}
            </div>

            <div className={`text-center py-3 rounded-2xl text-sm font-semibold ${isInBus ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {isInBus ? "🟢 Currently in bus" : "⭕ Not boarded"}
            </div>

            {!me.feesPaid ? (
              <div className="text-center py-3 bg-destructive/10 text-destructive rounded-2xl text-xs font-semibold">Fees unpaid — pay to enable boarding</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openTrip("entry")}
                  disabled={isInBus === true}
                  className="flex items-center justify-center gap-1.5 bg-success text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="size-4 fill-current" /> Start Trip
                </button>
                <button
                  onClick={() => openTrip("exit")}
                  disabled={!isInBus}
                  className="flex items-center justify-center gap-1.5 bg-destructive text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <StopCircle className="size-4" /> End Trip
                </button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center">Live face verification · No QR required</p>
          </div>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          {suspicious.some((x) => !x.resolved && (x.studentId === me.id || x.seatNo === me.seatNo)) && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-destructive">Security Alert: Seat Occupancy Conflict Detected</h4>
                <p className="text-xs text-foreground/80 mt-1">
                  A verification attempt or discrepancy was flagged on your assigned seat (<strong>{me.seatNo}</strong>).
                  If you are not currently in the bus, another individual may have attempted boarding using your seat.
                  The bus conductor has been notified with photo evidence.
                </p>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard label="Assigned Seat" value={me.seatNo} hint="Auto-allocated" tone="primary" icon={<Armchair className="size-4" />} />
            <StatCard label="Fee Status" value={me.feesPaid ? "PAID" : "DUE"} hint={`Fare ₹${route?.fare ?? 0}/sem`} tone={me.feesPaid ? "success" : "danger"} icon={<Wallet className="size-4" />} />
            <StatCard label="Attendance" value={`${attRate}%`} hint={`${myAttendance.length} entries`} tone="accent" icon={<ShieldCheck className="size-4" />} />
          </div>

          {!me.feesPaid && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">Semester fees pending</p>
                <p className="text-sm text-muted-foreground">Pay ₹{route?.fare ?? 0} to activate boarding access.</p>
              </div>
              <button onClick={handlePayFees} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
                Pay ₹{route?.fare ?? 0}
              </button>
            </div>
          )}

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="font-display text-xl font-extrabold text-foreground mb-1">{route?.name}</h3>
            <p className="text-sm text-muted-foreground mb-5">Live seat occupancy &amp; board status</p>
            <SeatGrid
              routeId={me.routeId}
              highlightStudentId={me.id}
              onboardStudentIds={new Set(attendance.filter((a) => a.busId === myBus?.id && a.type === "entry").map((a) => a.studentId))}
              emptyAlertStudentIds={new Set(activeTrip ? students.filter((s) => s.routeId === me.routeId && s.feesPaid && !attendance.some((a) => a.studentId === s.id && a.busId === myBus?.id && a.type === "entry")).map((s) => s.id) : [])}
            />
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h4 className="font-display font-bold mb-4 flex items-center gap-2"><History className="size-4" /> Attendance &amp; Payments</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Recent entries</p>
                <div className="space-y-2">
                  {myAttendance.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-muted rounded-xl text-sm">
                      <div className="flex items-center gap-2">
                        {a.verified || a.conductorOverride ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
                        <span className="font-medium capitalize">{a.type === "entry" ? "Start Trip" : "End Trip"}</span>
                        {a.conductorOverride && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Override</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</span>
                    </div>
                  ))}
                  {myAttendance.length === 0 && <p className="text-sm text-muted-foreground">No entries yet — use Start Trip to board.</p>}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Payments</p>
                <div className="space-y-2">
                  {myPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-xl text-sm">
                      <span className="font-medium">₹{p.amount}</span>
                      <span className="text-xs text-muted-foreground">{new Date(p.ts).toLocaleDateString()}</span>
                      <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded-md uppercase">{p.status}</span>
                    </div>
                  ))}
                  {myPayments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Trip verification modal ─────────────────────────────────────── */}
      {tripModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 grid place-items-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Face Verification</p>
                <h3 className="font-display text-2xl font-extrabold">
                  {tripModal === "entry" ? "Start Trip" : "End Trip"}
                </h3>
              </div>
              <button onClick={closeTrip} className="p-2 hover:bg-muted rounded-xl">
                <X className="size-4" />
              </button>
            </div>

            {tripStage === "no_active_trip" && (
              <div className="py-8 text-center">
                <div className="size-16 mx-auto rounded-full bg-muted grid place-items-center mb-4">
                  <Clock className="size-9 text-muted-foreground" />
                </div>
                <h4 className="font-display text-xl font-extrabold mb-2">No active trip</h4>
                <p className="text-muted-foreground text-sm mb-4">
                  The conductor has not started today's trip yet. Boarding opens once the trip is started.
                </p>
                <div className="bg-muted rounded-xl p-3 text-xs text-muted-foreground text-left mb-5">
                  Contact your bus conductor to start the trip. Once active, you can verify your attendance.
                </div>
                <button onClick={closeTrip} className="bg-muted text-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-muted/80 transition">Close</button>
              </div>
            )}

            {tripStage === "no_photo" && (
              <div className="py-8 text-center">
                <div className="size-16 mx-auto rounded-full bg-warning/10 grid place-items-center mb-4">
                  <UserX className="size-9 text-warning" />
                </div>
                <h4 className="font-display text-xl font-extrabold mb-2">No face photo on file</h4>
                <p className="text-muted-foreground text-sm mb-4">
                  Your account has no registered face photo. Face verification is required for self-service boarding.
                </p>
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-warning text-left mb-5">
                  <strong>To board today:</strong> Ask the conductor to manually mark your attendance. Then re-register with a face photo to enable self-service boarding.
                </div>
                <button onClick={closeTrip} className="bg-muted text-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-muted/80 transition">Close</button>
              </div>
            )}

            {tripStage === "capture" && (
              <FaceCapture
                onCapture={(url) => void handleTripCapture(url)}
                hint="Look straight into the camera. Only the registered face is accepted — good lighting, no mask."
                captureLabel={tripModal === "entry" ? "Verify & Start Trip" : "Verify & End Trip"}
              />
            )}

            {tripStage === "verifying" && (
              <div className="py-12 text-center">
                <div className="size-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-semibold">Matching face with registered photo…</p>
                <p className="text-sm text-muted-foreground mt-1">NCC comparison in progress</p>
              </div>
            )}

            {tripStage === "success" && (
              <div className="py-8 text-center">
                <div className="size-16 mx-auto rounded-full bg-success/10 grid place-items-center mb-4">
                  <CheckCircle2 className="size-9 text-success" />
                </div>
                <h4 className="font-display text-xl font-extrabold mb-1">
                  {tripModal === "entry" ? "Trip Started!" : "Trip Ended!"}
                </h4>
                <p className="text-muted-foreground text-sm mb-1">Attendance marked · Seat {me.seatNo}</p>
                {lastScore !== null && (
                  <p className="text-[11px] text-muted-foreground">Face match score: {(lastScore * 100).toFixed(0)}%</p>
                )}
                <p className="text-xs text-muted-foreground">{route?.name?.split("—")[0].trim()} · {new Date().toLocaleTimeString()}</p>
                <button onClick={closeTrip} className="mt-6 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition">Done</button>
              </div>
            )}

            {tripStage === "fail" && (
              <div className="py-8 text-center">
                <div className="size-16 mx-auto rounded-full bg-destructive/10 grid place-items-center mb-4">
                  <XCircle className="size-9 text-destructive" />
                </div>
                <h4 className="font-display text-xl font-extrabold mb-1">Face did not match</h4>
                {lastScore !== null && (
                  <p className="text-sm text-destructive mb-1">Score {(lastScore * 100).toFixed(0)}% — need ≥82%</p>
                )}
                <p className="text-muted-foreground text-sm mb-5">
                  Retry {tripRetries} of 3 — ensure good lighting, remove glasses, face the camera directly.
                </p>
                <button
                  onClick={() => setTripStage("capture")}
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition inline-flex items-center gap-2"
                >
                  <RefreshCcw className="size-4" /> Retry
                </button>
              </div>
            )}

            {tripStage === "blocked" && (
              <div className="py-8 text-center">
                <div className="size-16 mx-auto rounded-full bg-warning/10 grid place-items-center mb-4">
                  <AlertTriangle className="size-9 text-warning" />
                </div>
                <h4 className="font-display text-xl font-extrabold mb-1">Entry blocked</h4>
                <p className="text-muted-foreground text-sm mb-3">3 failed face verifications. Conductor &amp; admin notified with the captured image.</p>
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-warning text-left mb-5">
                  <ScanFace className="size-3.5 inline mr-1.5" />
                  Contact the conductor. They can review your photo and approve entry manually.
                </div>
                <button onClick={closeTrip} className="bg-muted text-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-muted/80 transition">Close</button>
              </div>
            )}

            {tripStage === "env_fail" && (
              <div className="py-8 text-center">
                <div className="size-16 mx-auto rounded-full bg-destructive/10 grid place-items-center mb-4">
                  <AlertTriangle className="size-9 text-destructive" />
                </div>
                <h4 className="font-display text-xl font-extrabold mb-1">Bus Interior Not Verified</h4>
                <p className="text-destructive text-sm font-medium mb-2">{envReason || "Remote selfie / non-bus background detected"}</p>
                <p className="text-muted-foreground text-xs mb-5 max-w-sm mx-auto">
                  Anti-fraud protection prevents attendance from outside the bus (hostel room, classroom, outside).
                  Please point your camera so bus seats or windows are visible behind you.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setTripStage("capture")}
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition inline-flex items-center gap-2"
                  >
                    <RefreshCcw className="size-4" /> Try Again Inside Bus
                  </button>
                  <button onClick={closeTrip} className="bg-muted text-foreground px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-muted/80 transition">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-muted rounded-xl px-3 py-2.5 flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">{icon} {value}</span>
    </div>
  );
}
