import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { SeatGrid } from "@/components/seat-grid";
import {
  Bus, Route as RouteIcon, Users, Wallet, AlertTriangle, Plus, Trash2,
  ShieldCheck, Armchair, CheckCircle2, ThumbsUp, ThumbsDown, RotateCcw,
  Search, X,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Tab = "overview" | "buses" | "routes" | "students" | "seats" | "payments" | "attendance" | "alerts" | "overrides";

function AdminPage() {
  const {
    buses, routes, students, payments, attendance, suspicious,
    addBus, removeBus, addRoute, removeRoute, assignSeat, overrides,
    declinedForTrip, declineForTrip, undeclineForTrip, removeStudent, logAttendance,
  } = useStore();

  const [tab, setTab] = useState<Tab>("overview");
  const [studentQ, setStudentQ] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const dueCount = students.filter((s) => !s.feesPaid).length;
  const unresolvedAlerts = suspicious.filter((x) => !x.resolved).length;
  const declinedSet = new Set(declinedForTrip);

  const filteredStudents = students.filter((s) =>
    (s.name + s.rollNo + s.branch).toLowerCase().includes(studentQ.toLowerCase())
  );

  const nav = [{ to: "/admin", label: "Admin", icon: <ShieldCheck className="size-3.5" /> }];

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <Bus className="size-4" /> },
    { id: "buses", label: "Buses", icon: <Bus className="size-4" /> },
    { id: "routes", label: "Routes", icon: <RouteIcon className="size-4" /> },
    { id: "students", label: "Students", icon: <Users className="size-4" /> },
    { id: "seats", label: "Seat allocation", icon: <Armchair className="size-4" /> },
    { id: "payments", label: "Payments", icon: <Wallet className="size-4" /> },
    { id: "attendance", label: "Attendance", icon: <Users className="size-4" /> },
    { id: "alerts", label: "Suspicious", icon: <AlertTriangle className="size-4" />, badge: unresolvedAlerts },
    { id: "overrides", label: "Overrides", icon: <CheckCircle2 className="size-4" />, badge: overrides.length },
  ];

  const handleAllow = (studentId: string) => {
    undeclineForTrip(studentId);
    const student = students.find((s) => s.id === studentId);
    const bus = buses.find((b) => b.routeId === student?.routeId);
    logAttendance(studentId, "entry", false, true);
    api.attendance.log({
      id: "a_admin_" + Date.now(),
      studentId, type: "entry", ts: Date.now(),
      busId: bus?.id ?? "", verified: false, conductorOverride: true,
    }).catch(console.error);
  };

  const handleDecline = (studentId: string) => {
    declineForTrip(studentId);
  };

  const handleUndecline = (studentId: string) => {
    undeclineForTrip(studentId);
  };

  const handleRemove = (studentId: string) => {
    setRemoveLoading(studentId);
    removeStudent(studentId);
    api.students.remove(studentId).catch(console.error);
    setConfirmRemoveId(null);
    setRemoveLoading(null);
  };

  return (
    <AppShell nav={nav} title="Admin Console">
      <div className="grid lg:grid-cols-12 gap-6">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="lg:col-span-3">
          <div className="bg-card border border-border rounded-3xl p-3 sticky top-24">
            <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Sections</p>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2.5 transition ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.icon} {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="ml-auto size-5 bg-destructive text-white rounded-full text-[10px] font-bold grid place-items-center shrink-0">{t.badge}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-9 space-y-6">
          {/* ── Overview ───────────────────────────────────────────────── */}
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Buses" value={buses.length} hint={`${routes.length} routes`} tone="primary" icon={<Bus className="size-4" />} />
                <StatCard label="Students" value={students.length} hint={`${dueCount} fees due`} tone="accent" icon={<Users className="size-4" />} />
                <StatCard label="Revenue" value={`₹${totalRevenue.toLocaleString()}`} hint={`${payments.length} payments`} tone="success" icon={<Wallet className="size-4" />} />
                <StatCard label="Alerts" value={unresolvedAlerts} hint="Unresolved entries" tone="danger" icon={<AlertTriangle className="size-4" />} />
              </div>
              <Panel title="Latest attendance">
                <Table headers={["Student", "Type", "Method", "Time"]}>
                  {attendance.slice(0, 8).map((a) => {
                    const s = students.find((x) => x.id === a.studentId);
                    return (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="py-3 text-sm font-medium">{s?.name ?? "—"}</td>
                        <td className="py-3 text-sm capitalize">{a.type}</td>
                        <td className="py-3">
                          {a.conductorOverride ? <Badge tone="primary">Override</Badge> : <Badge tone={a.verified ? "success" : "danger"}>{a.verified ? "Face Match" : "Failed"}</Badge>}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </Table>
              </Panel>
            </>
          )}

          {/* ── Buses ──────────────────────────────────────────────────── */}
          {tab === "buses" && (
            <Panel title="Manage buses" action={<AddBusInline onAdd={addBus} routes={routes} />}>
              <Table headers={["Number", "Route", "Capacity", "Driver", "Conductor", ""]}>
                {buses.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="py-3 text-sm font-mono font-semibold">{b.number}</td>
                    <td className="py-3 text-sm">{routes.find((r) => r.id === b.routeId)?.name ?? "—"}</td>
                    <td className="py-3 text-sm">{b.capacity}</td>
                    <td className="py-3 text-sm">{b.driver}</td>
                    <td className="py-3 text-sm">{b.conductor}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => removeBus(b.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                ))}
              </Table>
            </Panel>
          )}

          {/* ── Routes ─────────────────────────────────────────────────── */}
          {tab === "routes" && (
            <Panel title="Manage routes" action={<AddRouteInline onAdd={addRoute} />}>
              <Table headers={["Name", "Stops", "Fare", ""]}>
                {routes.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-3 text-sm font-semibold">{r.name}</td>
                    <td className="py-3 text-sm text-muted-foreground">{r.stops.join(" → ")}</td>
                    <td className="py-3 text-sm">₹{r.fare}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => removeRoute(r.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                ))}
              </Table>
            </Panel>
          )}

          {/* ── Students ───────────────────────────────────────────────── */}
          {tab === "students" && (
            <div className="space-y-4">
              {declinedForTrip.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-2xl px-4 py-3 text-sm flex items-center gap-2 text-destructive">
                  <ThumbsDown className="size-4 shrink-0" />
                  <span><strong>{declinedForTrip.length}</strong> student{declinedForTrip.length > 1 ? "s" : ""} currently declined from boarding. Declines reset on next trip.</span>
                </div>
              )}

              <Panel
                title={`Students (${filteredStudents.length})`}
                action={
                  <div className="relative">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={studentQ}
                      onChange={(e) => setStudentQ(e.target.value)}
                      placeholder="Search name, roll, branch…"
                      className="bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent w-56"
                    />
                  </div>
                }
              >
                <div className="space-y-2 max-h-[36rem] overflow-y-auto -mx-2 px-2">
                  {filteredStudents.map((s) => {
                    const routeName = routes.find((r) => r.id === s.routeId)?.name.split("—")[0].trim() ?? "—";
                    const isDeclined = declinedSet.has(s.id);
                    const isConfirming = confirmRemoveId === s.id;
                    const isRemoving = removeLoading === s.id;

                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition ${isDeclined ? "bg-destructive/5 border-destructive/20" : "bg-muted/40 border-transparent"}`}
                      >
                        {/* Photo */}
                        {s.photo ? (
                          <img src={s.photo} alt={s.name} className="size-10 rounded-xl object-cover border border-border shrink-0" />
                        ) : (
                          <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold text-sm shrink-0">
                            {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0 grid sm:grid-cols-4 gap-x-4 gap-y-0.5">
                          <div className="sm:col-span-2 min-w-0">
                            <p className="text-sm font-semibold truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.rollNo} · {s.branch} Sem {s.semester}</p>
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-xs font-medium truncate">{routeName}</p>
                            <p className="text-xs text-muted-foreground">Seat {s.seatNo} · {s.pickupPoint}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-2">
                            <Badge tone={s.feesPaid ? "success" : "danger"}>{s.feesPaid ? "Paid" : "Due"}</Badge>
                            {isDeclined && <Badge tone="danger">Declined</Badge>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isDeclined ? (
                            <button
                              onClick={() => handleUndecline(s.id)}
                              title="Undo decline"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-semibold rounded-lg transition"
                            >
                              <RotateCcw className="size-3" /> Restore
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAllow(s.id)}
                                disabled={!s.feesPaid}
                                title="Allow boarding — mark attendance entry"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <ThumbsUp className="size-3" /> Allow
                              </button>
                              <button
                                onClick={() => handleDecline(s.id)}
                                title="Decline boarding for this trip"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold rounded-lg hover:bg-destructive/20 transition"
                              >
                                <ThumbsDown className="size-3" /> Decline
                              </button>
                            </>
                          )}

                          {isConfirming ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRemove(s.id)}
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
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No students match your search.</p>
                  )}
                </div>
              </Panel>
            </div>
          )}

          {/* ── Seats ──────────────────────────────────────────────────── */}
          {tab === "seats" && <SeatAssignment routes={routes} students={students} onAssign={assignSeat} />}

          {/* ── Payments ───────────────────────────────────────────────── */}
          {tab === "payments" && (
            <Panel title="Payments">
              <Table headers={["Student", "Amount", "Status", "Date"]}>
                {payments.map((p) => {
                  const s = students.find((x) => x.id === p.studentId);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-3 text-sm font-semibold">{s?.name ?? "—"}</td>
                      <td className="py-3 text-sm">₹{p.amount}</td>
                      <td className="py-3"><Badge tone="success">{p.status}</Badge></td>
                      <td className="py-3 text-xs text-muted-foreground">{new Date(p.ts).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </Table>
            </Panel>
          )}

          {/* ── Attendance ─────────────────────────────────────────────── */}
          {tab === "attendance" && (
            <Panel title="All attendance logs">
              <Table headers={["Student", "Type", "Method", "Time"]}>
                {attendance.map((a) => {
                  const s = students.find((x) => x.id === a.studentId);
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-3 text-sm font-medium">{s?.name ?? "—"}</td>
                      <td className="py-3 text-sm capitalize">{a.type}</td>
                      <td className="py-3">
                        {a.conductorOverride ? <Badge tone="primary">Override</Badge> : <Badge tone={a.verified ? "success" : "danger"}>{a.verified ? "Face Match" : "Failed"}</Badge>}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </Table>
            </Panel>
          )}

          {/* ── Suspicious alerts ──────────────────────────────────────── */}
          {tab === "alerts" && (
            <Panel title="Suspicious entries">
              {suspicious.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No alerts. All boardings verified.</p>
              ) : (
                <div className="space-y-4">
                  {suspicious.map((x) => {
                    const s = students.find((y) => y.id === x.studentId);
                    return (
                      <div key={x.id} className={`flex items-start gap-4 p-4 border rounded-2xl flex-wrap ${x.resolved ? "bg-muted/30 border-border opacity-60" : "bg-destructive/5 border-destructive/20"}`}>
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="size-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center shrink-0">
                            <AlertTriangle className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {s?.name ?? "Unknown"}{" "}
                              <span className="text-muted-foreground font-normal text-sm">· {s?.rollNo}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">{x.reason}</p>
                            {x.seatNo && <p className="text-xs text-muted-foreground mt-0.5">Seat {x.seatNo} · {routes.find((r) => r.id === s?.routeId)?.name.split("—")[0].trim()}</p>}
                            <p className="text-xs text-muted-foreground mt-1">{new Date(x.ts).toLocaleString()}</p>
                            {x.resolved && <Badge tone="success">Resolved by conductor</Badge>}
                          </div>
                        </div>
                        {x.capturedImage && (
                          <div className="shrink-0">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Captured image</p>
                            <img src={x.capturedImage} alt="Suspicious capture" className="size-24 rounded-xl object-cover border border-border" />
                          </div>
                        )}
                        {s?.photo && (
                          <div className="shrink-0">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Registered photo</p>
                            <img src={s.photo} alt="Registered" className="size-24 rounded-xl object-cover border border-border" />
                          </div>
                        )}
                        {!x.resolved && s && (
                          <div className="w-full flex gap-2 pt-1">
                            <button
                              onClick={() => handleAllow(s.id)}
                              className="flex items-center gap-2 bg-success text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-90 transition"
                            >
                              <ThumbsUp className="size-3.5" /> Allow boarding
                            </button>
                            <button
                              onClick={() => handleDecline(s.id)}
                              className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-destructive/20 transition"
                            >
                              <ThumbsDown className="size-3.5" /> Decline boarding
                            </button>
                            <button
                              onClick={() => setConfirmRemoveId(s.id)}
                              className="flex items-center gap-2 text-destructive border border-destructive/20 bg-destructive/5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-destructive/20 transition ml-auto"
                            >
                              <Trash2 className="size-3.5" /> Remove student
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}

          {/* ── Overrides ──────────────────────────────────────────────── */}
          {tab === "overrides" && (
            <Panel title="Conductor overrides">
              {overrides.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No conductor overrides recorded.</p>
              ) : (
                <Table headers={["Student", "Approved by", "Remarks", "Type", "Time"]}>
                  {overrides.map((o) => {
                    const s = students.find((x) => x.id === o.studentId);
                    return (
                      <tr key={o.id} className="border-b border-border last:border-0">
                        <td className="py-3 text-sm font-semibold">{s?.name ?? "—"}</td>
                        <td className="py-3 text-sm">{o.conductorName}</td>
                        <td className="py-3 text-sm text-muted-foreground max-w-xs truncate">{o.remarks}</td>
                        <td className="py-3 capitalize text-sm">{o.attendanceType}</td>
                        <td className="py-3 text-xs text-muted-foreground">{new Date(o.ts).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </Panel>
          )}
        </section>
      </div>

      {/* ── Global remove confirmation modal ───────────────────────────── */}
      {confirmRemoveId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 grid place-items-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="size-12 rounded-full bg-destructive/10 grid place-items-center mx-auto mb-4">
              <Trash2 className="size-6 text-destructive" />
            </div>
            <h3 className="font-display text-xl font-extrabold text-center mb-1">Remove student?</h3>
            <p className="text-sm text-muted-foreground text-center mb-2">
              <strong>{students.find((s) => s.id === confirmRemoveId)?.name}</strong> will be permanently deleted from the database.
            </p>
            <p className="text-xs text-center text-destructive/70 bg-destructive/5 border border-destructive/20 rounded-xl p-2 mb-5">
              This removes their attendance history, payments, and all records. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRemove(confirmRemoveId)}
                disabled={removeLoading === confirmRemoveId}
                className="flex-1 bg-destructive text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {removeLoading === confirmRemoveId ? "Removing…" : "Remove permanently"}
              </button>
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="px-5 bg-muted rounded-xl hover:bg-muted/80 transition text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h3 className="font-display text-lg font-extrabold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full">
        <thead>
          <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
            {headers.map((h) => <th key={h} className="pb-3 px-2">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Badge({ tone, children }: { tone: "success" | "danger" | "primary"; children: React.ReactNode }) {
  const cls =
    tone === "success" ? "bg-success/10 text-success" :
    tone === "danger" ? "bg-destructive/10 text-destructive" :
    "bg-primary/10 text-primary";
  return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${cls}`}>{children}</span>;
}

function AddBusInline({ onAdd, routes }: {
  onAdd: (b: { number: string; capacity: number; routeId: string; driver: string; conductor: string }) => void;
  routes: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ number: "", capacity: 40, routeId: routes[0]?.id ?? "", driver: "", conductor: "" });
  if (!open) return <button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"><Plus className="size-4" />Add bus</button>;
  return (
    <div className="flex flex-wrap gap-2 items-center w-full">
      <input placeholder="DL-XX-0000" value={v.number} onChange={(e) => setV({ ...v, number: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      <input type="number" value={v.capacity} onChange={(e) => setV({ ...v, capacity: +e.target.value })} className="w-20 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      <select value={v.routeId} onChange={(e) => setV({ ...v, routeId: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm">{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <input placeholder="Driver" value={v.driver} onChange={(e) => setV({ ...v, driver: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      <input placeholder="Conductor" value={v.conductor} onChange={(e) => setV({ ...v, conductor: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      <button onClick={() => { if (v.number) { onAdd(v); setOpen(false); } }} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold">Save</button>
      <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted">Cancel</button>
    </div>
  );
}

function AddRouteInline({ onAdd }: { onAdd: (r: { name: string; stops: string[]; fare: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: "", stops: "", fare: 4500 });
  if (!open) return <button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"><Plus className="size-4" />Add route</button>;
  return (
    <div className="flex flex-wrap gap-2 items-center w-full">
      <input placeholder="Route name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-accent" />
      <input placeholder="Stop A, Stop B, Stop C" value={v.stops} onChange={(e) => setV({ ...v, stops: e.target.value })} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-accent" />
      <input type="number" value={v.fare} onChange={(e) => setV({ ...v, fare: +e.target.value })} className="w-24 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      <button onClick={() => { if (v.name) { onAdd({ name: v.name, stops: v.stops.split(",").map((s) => s.trim()).filter(Boolean), fare: v.fare }); setOpen(false); } }} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold">Save</button>
      <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted">Cancel</button>
    </div>
  );
}

function SeatAssignment({ routes, students, onAssign }: {
  routes: { id: string; name: string }[];
  students: { id: string; name: string; routeId: string; seatNo: string }[];
  onAssign: (sid: string, seat: string) => void;
}) {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students.find((s) => s.routeId === routeId)?.id ?? "");
  return (
    <Panel title="Assign seats">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-2 block">Route</label>
          <select value={routeId} onChange={(e) => { setRouteId(e.target.value); setStudentId(""); }} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-accent">
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <label className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-2 block">Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="">Select student…</option>
            {students.filter((s) => s.routeId === routeId).map((s) => <option key={s.id} value={s.id}>{s.name} (current: {s.seatNo})</option>)}
          </select>
          <p className="text-xs text-muted-foreground mt-3">Tap an empty seat in the grid to assign it to the selected student.</p>
        </div>
        <div>
          <SeatGrid routeId={routeId} highlightStudentId={studentId} selectableEmpty={!!studentId} onSelectSeat={(seat) => studentId && onAssign(studentId, seat)} />
        </div>
      </div>
    </Panel>
  );
}
