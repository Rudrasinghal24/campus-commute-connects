import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { SeatGrid } from "@/components/seat-grid";
import { StatCard } from "@/components/stat-card";
import { UserCog, ScanLine, Users, CheckCircle2, ShieldCheck, Search } from "lucide-react";

export const Route = createFileRoute("/conductor")({
  component: ConductorPage,
});

function ConductorPage() {
  const { students, buses, routes, attendance, logAttendance } = useStore();
  const [busId, setBusId] = useState(buses[0]?.id ?? "");
  const bus = buses.find((b) => b.id === busId);
  const route = routes.find((r) => r.id === bus?.routeId);
  const onRoute = students.filter((s) => s.routeId === bus?.routeId);
  const [q, setQ] = useState("");
  const filtered = onRoute.filter((s) => (s.name + s.rollNo).toLowerCase().includes(q.toLowerCase()));

  const onboardSet = new Set(
    attendance.filter((a) => a.busId === busId && a.type === "entry").map((a) => a.studentId)
  );

  const nav = [
    { to: "/conductor", label: "Conductor", icon: <UserCog className="size-3.5" /> },
  ];

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
        <StatCard label="Manual" value={attendance.filter((a) => a.busId === busId && !a.verified).length} hint="Override marks" tone="warning" icon={<CheckCircle2 className="size-4" />} />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="font-display text-lg font-extrabold">Student list</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <Link to="/scan" className="bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5">
                <ScanLine className="size-4" /> Scan
              </Link>
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOn ? (
                      <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded-md uppercase">Boarded</span>
                    ) : (
                      <button onClick={() => logAttendance(s.id, "entry", false)} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg">
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
    </AppShell>
  );
}
