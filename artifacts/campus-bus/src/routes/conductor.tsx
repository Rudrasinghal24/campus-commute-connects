import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { SeatGrid } from "@/components/seat-grid";
import { StatCard } from "@/components/stat-card";
import { UserCog, Users, CheckCircle2, ShieldCheck, Search, AlertTriangle, X } from "lucide-react";

export const Route = createFileRoute("/conductor")({
  component: ConductorPage,
});

type Tab = "students" | "alerts";

function ConductorPage() {
  const { students, buses, routes, attendance, logAttendance, suspicious, addOverride, overrides } = useStore();
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

  const onboardSet = new Set(
    attendance.filter((a) => a.busId === busId && a.type === "entry").map((a) => a.studentId)
  );

  const pendingAlerts = suspicious.filter((x) => {
    const student = students.find((s) => s.id === x.studentId);
    return student?.routeId === bus?.routeId && !x.resolved;
  });

  const nav = [{ to: "/conductor", label: "Conductor", icon: <UserCog className="size-3.5" /> }];

  const handleOverrideSubmit = () => {
    if (!overrideModal || !conductorName.trim()) return;
    const ts = Date.now();
    const overrideId = "ov_" + ts;
    addOverride(overrideModal.suspiciousId, overrideModal.studentId, conductorName, overrideRemarks || "Conductor verified in person", overrideModal.type);
    api.overrides.add({
      id: overrideId,
      suspiciousEntryId: overrideModal.suspiciousId,
      studentId: overrideModal.studentId,
      conductorName,
      remarks: overrideRemarks || "Conductor verified in person",
      ts,
      attendanceType: overrideModal.type,
    }).catch(console.error);
    setOverrideModal(null);
    setOverrideRemarks("");
    console.log("[Conductor] Override approved:", overrideModal.suspiciousId);
  };

  return (
    <AppShell nav={nav} title="Conductor">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Active Bus</p>
          <h1 className="font-display text-3xl font-extrabold">{bus?.number} · {route?.name.split("—")[0].trim()}</h1>
        </div>
        <select value={busId} onChange={(e) => setBusId(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
          {buses.map((b) => <option key={b.id} value={b.id}>{b.number}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Capacity" value={`${onboardSet.size}/${bus?.capacity ?? 0}`} hint="Currently boarded" tone="primary" icon={<Users className="size-4" />} />
        <StatCard label="On Route" value={onRoute.length} hint="Assigned students" tone="accent" icon={<UserCog className="size-4" />} />
        <StatCard label="Verified" value={attendance.filter((a) => a.busId === busId && a.verified).length} hint="Today" tone="success" icon={<ShieldCheck className="size-4" />} />
        <StatCard label="Alerts" value={pendingAlerts.length} hint="Pending review" tone={pendingAlerts.length > 0 ? "danger" : "warning"} icon={<AlertTriangle className="size-4" />} />
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("students")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === "students" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          Student List
        </button>
        <button
          onClick={() => setTab("alerts")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${tab === "alerts" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          Suspicious Alerts
          {pendingAlerts.length > 0 && (
            <span className="size-5 bg-destructive text-white rounded-full text-[10px] font-bold grid place-items-center">{pendingAlerts.length}</span>
          )}
        </button>
      </div>

      {tab === "students" && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="font-display text-lg font-extrabold">Student list</h3>
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {filtered.map((s) => {
                const isOn = onboardSet.has(s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 bg-muted rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold text-sm shrink-0">
                        {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.rollNo} · Seat {s.seatNo} · {s.pickupPoint}</p>
                        {!s.feesPaid && <span className="text-[10px] text-destructive font-bold">Fees unpaid</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOn ? (
                        <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded-md uppercase">Boarded</span>
                      ) : (
                        <button onClick={() => logAttendance(s.id, "entry", false, true)} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg">
                          Mark entry
                        </button>
                      )}
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
      )}

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
                        {alert.capturedImage && (
                          <img src={alert.capturedImage} alt="Captured" className="size-20 rounded-xl object-cover border border-border shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-2 mt-4 flex-wrap">
                        <button
                          onClick={() => {
                            setConductorName(bus?.conductor ?? "");
                            setOverrideModal({ suspiciousId: alert.id, studentId: alert.studentId, type: "entry" });
                          }}
                          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                        >
                          Approve — this is the genuine student
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {overrides.filter((o) => {
            const student = students.find((s) => s.id === o.studentId);
            return student?.routeId === bus?.routeId;
          }).length > 0 && (
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-extrabold mb-4">Past overrides</h3>
              <div className="space-y-3">
                {overrides
                  .filter((o) => {
                    const s = students.find((x) => x.id === o.studentId);
                    return s?.routeId === bus?.routeId;
                  })
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
                <input
                  value={conductorName}
                  onChange={(e) => setConductorName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Remarks (optional)</label>
                <textarea
                  value={overrideRemarks}
                  onChange={(e) => setOverrideRemarks(e.target.value)}
                  placeholder="Conductor verified identity in person, student left ID at home, etc."
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleOverrideSubmit}
                  disabled={!conductorName.trim()}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  Approve & Mark Entry
                </button>
                <button onClick={() => setOverrideModal(null)} className="px-4 bg-muted rounded-xl hover:bg-muted/80 transition text-sm font-medium">
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
