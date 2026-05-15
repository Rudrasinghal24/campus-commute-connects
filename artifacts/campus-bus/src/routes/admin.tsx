import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { SeatGrid } from "@/components/seat-grid";
import { Bus, Route as RouteIcon, Users, Wallet, AlertTriangle, Plus, Trash2, ShieldCheck, Armchair } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Tab = "overview" | "buses" | "routes" | "students" | "seats" | "payments" | "attendance" | "alerts";

function AdminPage() {
  const { buses, routes, students, payments, attendance, suspicious, addBus, removeBus, addRoute, removeRoute, assignSeat } = useStore();
  const [tab, setTab] = useState<Tab>("overview");
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const dueCount = students.filter((s) => !s.feesPaid).length;

  const nav = [
    { to: "/admin", label: "Admin", icon: <ShieldCheck className="size-3.5" /> },
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Bus className="size-4" /> },
    { id: "buses", label: "Buses", icon: <Bus className="size-4" /> },
    { id: "routes", label: "Routes", icon: <RouteIcon className="size-4" /> },
    { id: "students", label: "Students", icon: <Users className="size-4" /> },
    { id: "seats", label: "Seat allocation", icon: <Armchair className="size-4" /> },
    { id: "payments", label: "Payments", icon: <Wallet className="size-4" /> },
    { id: "attendance", label: "Attendance", icon: <Users className="size-4" /> },
    { id: "alerts", label: "Suspicious", icon: <AlertTriangle className="size-4" /> },
  ];

  return (
    <AppShell nav={nav} title="Admin Console">
      <div className="grid lg:grid-cols-12 gap-6">
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
              </button>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-9 space-y-6">
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Buses" value={buses.length} hint={`${routes.length} routes`} tone="primary" icon={<Bus className="size-4" />} />
                <StatCard label="Students" value={students.length} hint={`${dueCount} fees due`} tone="accent" icon={<Users className="size-4" />} />
                <StatCard label="Revenue" value={`₹${totalRevenue.toLocaleString()}`} hint={`${payments.length} payments`} tone="success" icon={<Wallet className="size-4" />} />
                <StatCard label="Alerts" value={suspicious.length} hint="Suspicious entries" tone="danger" icon={<AlertTriangle className="size-4" />} />
              </div>
              <Panel title="Latest attendance">
                <Table headers={["Student", "Type", "Verified", "Time"]}>
                  {attendance.slice(0, 8).map((a) => {
                    const s = students.find((x) => x.id === a.studentId);
                    return (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="py-3 text-sm font-medium">{s?.name ?? "—"}</td>
                        <td className="py-3 text-sm capitalize">{a.type}</td>
                        <td className="py-3"><Badge tone={a.verified ? "success" : "danger"}>{a.verified ? "Verified" : "Failed"}</Badge></td>
                        <td className="py-3 text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </Table>
              </Panel>
            </>
          )}

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

          {tab === "students" && (
            <Panel title="Students">
              <Table headers={["Name", "Roll", "Branch", "Route", "Seat", "Fees"]}>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="py-3 text-sm font-semibold">{s.name}</td>
                    <td className="py-3 text-sm font-mono">{s.rollNo}</td>
                    <td className="py-3 text-sm">{s.branch} · {s.semester}</td>
                    <td className="py-3 text-sm">{routes.find((r) => r.id === s.routeId)?.name.split("—")[0].trim()}</td>
                    <td className="py-3 text-sm font-mono">{s.seatNo}</td>
                    <td className="py-3"><Badge tone={s.feesPaid ? "success" : "danger"}>{s.feesPaid ? "Paid" : "Due"}</Badge></td>
                  </tr>
                ))}
              </Table>
            </Panel>
          )}

          {tab === "seats" && <SeatAssignment routes={routes} students={students} onAssign={assignSeat} />}

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

          {tab === "attendance" && (
            <Panel title="All attendance logs">
              <Table headers={["Student", "Type", "Verified", "Time"]}>
                {attendance.map((a) => {
                  const s = students.find((x) => x.id === a.studentId);
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-3 text-sm font-medium">{s?.name ?? "—"}</td>
                      <td className="py-3 text-sm capitalize">{a.type}</td>
                      <td className="py-3"><Badge tone={a.verified ? "success" : "danger"}>{a.verified ? "Verified" : "Failed"}</Badge></td>
                      <td className="py-3 text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </Table>
            </Panel>
          )}

          {tab === "alerts" && (
            <Panel title="Suspicious entries">
              {suspicious.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No alerts. All boardings verified.</p>
              ) : (
                <div className="space-y-3">
                  {suspicious.map((x) => {
                    const s = students.find((y) => y.id === x.studentId);
                    return (
                      <div key={x.id} className="flex items-start justify-between gap-4 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <div className="size-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center"><AlertTriangle className="size-5" /></div>
                          <div>
                            <p className="font-semibold">{s?.name ?? "Unknown"} <span className="text-muted-foreground font-normal text-sm">· {s?.rollNo}</span></p>
                            <p className="text-sm text-muted-foreground">{x.reason}</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(x.ts).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}
        </section>
      </div>
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
  const cls = tone === "success" ? "bg-success/10 text-success" : tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary";
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
