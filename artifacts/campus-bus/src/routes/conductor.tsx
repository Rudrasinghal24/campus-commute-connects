import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { SeatGrid } from "@/components/seat-grid";
import { StatCard } from "@/components/stat-card";
import {
  UserCog, Users, CheckCircle2, ShieldCheck, Search, AlertTriangle,
  X, Play, StopCircle, Clock, UserX, Trash2, ThumbsUp, ThumbsDown,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/conductor")({
  component: ConductorPage,
});

type Tab = "students" | "alerts";

function ConductorPage() {
  const {
    students, buses, routes, attendance, trips, startTrip, endTrip,
    declinedForTrip, declineForTrip, undeclineForTrip, removeStudent,
    logAttendance, suspicious, addOverride, overrides,
  } = useStore();

  const [busId, setBusId] = useState(buses[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("students");
  const bus = buses.find((b) => b.id === busId);
  const route = routes.find((r) => r.id === bus?.routeId);
  const onRoute = students.filter((s) => s.routeId === bus?.routeId);
  const [q, setQ] = useState("");
  const filtered = onRoute.filter((s) => (s.name + s.rollNo).toLowerCase().includes(q.toLowerCase()));

  const [overrideModal, setOverrideModal] = useState<{ suspiciousId: string; studentId: string; type: "entry" | "exit" } | null>(null);
  const [overrideRemarks, setOverrideRemarks] = useState("");
  const [conductorName, setConductorName] = useState(bus?.conductor ?? "");
  const [tripLoading, setTripLoading] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  const activeTrip = trips.find((t) => t.busId === busId && t.status === "active");

  const onboardSet = new Set(
    attendance.filter((a) => a.busId === busId && a.type === "entry").map((a) => a.studentId)
  );
  const declinedSet = new Set(declinedForTrip);

  const notBoardedPaid = onRoute.filter((s) => s.feesPaid && !onboardSet.has(s.id) && !declinedSet.has(s.id));
  const pendingAlerts = suspicious.filter((x) => {
    const student = students.find((s) => s.id === x.studentId);
    return student?.routeId === bus?.routeId && !x.resolved;
  });

  const nav = [{ to: "/conductor", label: "Conductor", icon: <UserCog className="size-3.5" /> }];

  const handleStartTrip = () => {
    if (!bus || activeTrip || tripLoading) return;
    setTripLoading(true);
    startTrip(busId, bus.routeId);
    api.trips.start(busId, bus.routeId).catch(console.error);
    setTripLoading(false);
  };

  const handleEndTrip = () => {
    if (!activeTrip || tripLoading) return;
    setTripLoading(true);
    endTrip(busId);
    api.trips.end(busId).catch(console.error);
    setTripLoading(false);
  };

  const handleAllow = (studentId: string) => {
    if (!activeTrip) return;
    undeclineForTrip(studentId);
    logAttendance(studentId, "entry", false, true);
    api.attendance.log({
      id: "a_allow_" + Date.now(),
      studentId, type: "entry", ts: Date.now(), busId, verified: false, conductorOverride: true,
    }).catch(console.error);
  };

  const handleDecline = (studentId: string) => {
    declineForTrip(studentId);
  };

  const handleUndecline = (studentId: string) => {
    undeclineForTrip(studentId);
  };

  const handleRemove = async (studentId: string) => {
    setRemoveLoading(studentId);
    removeStudent(studentId);
    api.students.remove(studentId).catch(console.error);
    setConfirmRemoveId(null);
    setRemoveLoading(null);
  };

  const handleOverrideSubmit = () => {
    if (!overrideModal || !conductorName.trim()) return;
    const ts = Date.now();
    addOverride(overrideModal.suspiciousId, overrideModal.studentId, conductorName, overrideRemarks || "Conductor verified in person", overrideModal.type);
    api.overrides.add({
      id: "ov_" + ts, suspiciousEntryId: overrideModal.suspiciousId,
      studentId: overrideModal.studentId, conductorName,
      remarks: overrideRemarks || "Conductor verified in person", ts, attendanceType: overrideModal.type,
    }).catch(console.error);
    setOverrideModal(null);
    setOverrideRemarks("");
  };

  return (
    <AppShell nav={nav} title="Conductor">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Active Bus</p>
          <h1 className="font-display text-3xl font-extrabold">{bus?.number} · {route?.name.split("—")[0].trim()}</h1>
        </div>
        <select value={busId} onChange={(e) => setBusId(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
          {buses.map((b) => <option key={b.id} value={b.id}>{b.number}</option>)}
        </select>
      </div>

      {/* ── Trip lifecycle controls ─────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 mb-5 flex flex-wrap items-center justify-between gap-4 transition ${activeTrip ? "bg-success/5 border-success/30" : "bg-muted/50 border-border"}`}>
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-xl grid place-items-center ${activeTrip ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
            {activeTrip ? <Play className="size-5 fill-current" /> : <Clock className="size-5" />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Trip Status</p>
            <p className={`font-display text-lg font-extrabold ${activeTrip ? "text-success" : "text-muted-foreground"}`}>
              {activeTrip ? "TRIP ACTIVE" : "NOT STARTED"}
            </p>
            {activeTrip && <p className="text-xs text-muted-foreground">Started {new Date(activeTrip.startedAt).toLocaleTimeString()}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleStartTrip} disabled={!!activeTrip || tripLoading}
            className="flex items-center gap-2 bg-success text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <Play className="size-4 fill-current" /> Start Trip
          </button>
          <button onClick={handleEndTrip} disabled={!activeTrip || tripLoading}
            className="flex items-center gap-2 bg-destructive text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <StopCircle className="size-4" /> End Trip
          </button>
        </div>
      </div>

      {!activeTrip && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-5 text-sm text-warning flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          Students cannot board until you start the trip. Click <strong className="mx-1">Start Trip</strong> to open the attendance window.
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Capacity" value={`${onboardSet.size}/${bus?.capacity ?? 0}`} hint="Currently boarded" tone="primary" icon={<Users className="size-4" />} />
        <StatCard label="On Route" value={onRoute.length} hint="Assigned students" tone="accent" icon={<UserCog className="size-4" />} />
        <StatCard label="Absent" value={notBoardedPaid.length} hint={activeTrip ? "Not yet boarded" : "Trip not started"} tone={notBoardedPaid.length > 0 && !!activeTrip ? "danger" : "warning"} icon={<UserX className="size-4" />} />
        <StatCard label="Alerts" value={pendingAlerts.length} hint="Pending review" tone={pendingAlerts.length > 0 ? "danger" : "warning"} icon={<AlertTriangle className="size-4" />} />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("students")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === "students" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          Student List
        </button>
        <button onClick={() => setTab("alerts")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${tab === "alerts" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          Suspicious Alerts
          {pendingAlerts.length > 0 && (
            <span className="size-5 bg-destructive text-white rounded-full text-[10px] font-bold grid place-items-center">{pendingAlerts.length}</span>
          )}
        </button>
      </div>

      {/* ── Students tab ───────────────────────────────────────────────── */}
      {tab === "students" && (
        <div className="space-y-6">
          {activeTrip && notBoardedPaid.length > 0 && (
            <div className="bg-card border border-warning/40 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <UserX className="size-4 text-warning" />
                <h3 className="font-display font-bold text-warning">Empty Seat Alerts ({notBoardedPaid.length})</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">These students have paid but have not boarded yet.</p>
              <div className="space-y-2">
                {notBoardedPaid.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-xl gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.rollNo} · Seat {s.seatNo} · {s.pickupPoint}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleAllow(s.id)}
                        className="px-3 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:opacity-90">
                        Allow
                      </button>
                      <button onClick={() => handleDecline(s.id)}
                        className="px-3 py-1.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-lg hover:bg-destructive/20 border border-destructive/20">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="font-display text-lg font-extrabold">Student list</h3>
                <div className="relative">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                    className="bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>

              <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                {filtered.map((s) => {
                  const isBoarded = onboardSet.has(s.id);
                  const isDeclined = declinedSet.has(s.id);
                  const isRemoving = removeLoading === s.id;
                  const isConfirmingRemove = confirmRemoveId === s.id;

                  return (
                    <div key={s.id} className={`p-3 rounded-2xl border transition ${isDeclined ? "bg-destructive/5 border-destructive/20" : "bg-muted border-transparent"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {s.photo ? (
                            <img src={s.photo} alt={s.name} className="size-10 rounded-xl object-cover border border-border shrink-0" />
                          ) : (
                            <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold text-sm shrink-0">
                              {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.rollNo} · Seat {s.seatNo} · {s.pickupPoint}</p>
                            {!s.feesPaid && <span className="text-[10px] text-destructive font-bold">Fees unpaid</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isBoarded ? (
                            <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded-md uppercase">Boarded</span>
                          ) : isDeclined ? (
                            <>
                              <span className="px-2 py-1 bg-destructive/10 text-destructive text-[10px] font-bold rounded-md uppercase">Declined</span>
                              <button
                                onClick={() => handleUndecline(s.id)}
                                title="Undo decline"
                                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition"
                              >
                                <RotateCcw className="size-3.5" />
                              </button>
                            </>
                          ) : !activeTrip ? (
                            <span className="px-2 py-1 bg-muted-foreground/10 text-muted-foreground text-[10px] font-bold rounded-md uppercase">No trip</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAllow(s.id)}
                                disabled={!s.feesPaid}
                                title="Allow boarding"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <ThumbsUp className="size-3" /> Allow
                              </button>
                              <button
                                onClick={() => handleDecline(s.id)}
                                title="Decline boarding"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-lg hover:bg-destructive/20 border border-destructive/20 transition"
                              >
                                <ThumbsDown className="size-3" /> Decline
                              </button>
                            </>
                          )}

                          {/* ── Remove student ───────────────────── */}
                          {isConfirmingRemove ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => void handleRemove(s.id)}
                                disabled={isRemoving}
                                className="px-2.5 py-1.5 bg-destructive text-white text-xs font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                              >
                                {isRemoving ? "…" : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition text-muted-foreground"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemoveId(s.id)}
                              title="Remove student from database"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No students match.</p>}
              </div>
            </div>

            <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-extrabold mb-4">Occupied seats</h3>
              {bus && <SeatGrid routeId={bus.routeId} />}
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts tab ─────────────────────────────────────────────────── */}
      {tab === "alerts" && (
        <div className="space-y-4">
          {pendingAlerts.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-10 text-center">
              <CheckCircle2 className="size-10 text-success mx-auto mb-3" />
              <p className="font-semibold text-foreground">No pending alerts</p>
              <p className="text-sm text-muted-foreground mt-1">All boardings verified on this route.</p>
            </div>
          ) : (
            pendingAlerts.map((alert) => {
              const student = students.find((s) => s.id === alert.studentId);
              return (
                <div key={alert.id} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="size-12 rounded-xl bg-destructive/10 text-destructive grid place-items-center shrink-0">
                      <AlertTriangle className="size-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-foreground">{student?.name ?? "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{student?.rollNo} · Seat {alert.seatNo ?? student?.seatNo}</p>
                          <p className="text-sm text-destructive mt-1">{alert.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(alert.ts).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {student?.photo && (
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground mb-1">Registered</p>
                              <img src={student.photo} alt="Registered" className="size-20 rounded-xl object-cover border border-border" />
                            </div>
                          )}
                          {alert.capturedImage && (
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground mb-1">Captured</p>
                              <img src={alert.capturedImage} alt="Captured" className="size-20 rounded-xl object-cover border border-destructive/30" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 flex-wrap">
                        <button
                          onClick={() => { setConductorName(bus?.conductor ?? ""); setOverrideModal({ suspiciousId: alert.id, studentId: alert.studentId, type: "entry" }); }}
                          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                        >
                          <ThumbsUp className="size-4" /> Approve — genuine student
                        </button>
                        <button
                          onClick={() => handleDecline(alert.studentId)}
                          className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-destructive/20 transition"
                        >
                          <ThumbsDown className="size-4" /> Decline boarding
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {overrides.filter((o) => { const s = students.find((x) => x.id === o.studentId); return s?.routeId === bus?.routeId; }).length > 0 && (
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-extrabold mb-4">Past overrides</h3>
              <div className="space-y-3">
                {overrides
                  .filter((o) => { const s = students.find((x) => x.id === o.studentId); return s?.routeId === bus?.routeId; })
                  .map((o) => {
                    const s = students.find((x) => x.id === o.studentId);
                    return (
                      <div key={o.id} className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                        <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium">{s?.name} approved by {o.conductorName}</p>
                          <p className="text-muted-foreground text-xs">{o.remarks} · {new Date(o.ts).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Override modal ─────────────────────────────────────────────── */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 grid place-items-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display text-xl font-extrabold">Conductor Override</h3>
                <p className="text-sm text-muted-foreground">
                  Manually approve attendance for {students.find((s) => s.id === overrideModal.studentId)?.name}
                </p>
              </div>
              <button onClick={() => setOverrideModal(null)} className="p-2 hover:bg-muted rounded-xl">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Conductor Name *</label>
                <input value={conductorName} onChange={(e) => setConductorName(e.target.value)} placeholder="Your name"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Remarks (optional)</label>
                <textarea value={overrideRemarks} onChange={(e) => setOverrideRemarks(e.target.value)}
                  placeholder="Conductor verified identity in person…" rows={3}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleOverrideSubmit} disabled={!conductorName.trim()}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
                  Approve & Mark Entry
                </button>
                <button onClick={() => setOverrideModal(null)}
                  className="px-4 bg-muted rounded-xl hover:bg-muted/80 transition text-sm font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
