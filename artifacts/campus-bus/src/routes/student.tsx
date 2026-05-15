import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { SeatGrid } from "@/components/seat-grid";
import { StatCard } from "@/components/stat-card";
import { Bus, QrCode, Wallet, History, Armchair, ScanLine, MapPin, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/student")({
  component: StudentPage,
});

function StudentPage() {
  const { students, currentStudentId, routes, attendance, payments, payFees } = useStore();
  const me = students.find((s) => s.id === currentStudentId) ?? students[0];
  const route = routes.find((r) => r.id === me?.routeId);
  const myAttendance = attendance.filter((a) => a.studentId === me?.id);
  const myPayments = payments.filter((p) => p.studentId === me?.id);
  const attRate = myAttendance.length === 0 ? 0 : Math.round((myAttendance.filter((a) => a.verified).length / myAttendance.length) * 100);
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    if (!me) return;
    void QRCode.toDataURL(JSON.stringify({ id: me.id, roll: me.rollNo, seat: me.seatNo, route: me.routeId }), {
      width: 320,
      margin: 1,
      color: { dark: "#1e1b4b", light: "#ffffff" },
    }).then(setQr);
  }, [me]);

  if (!me) return null;

  const nav = [
    { to: "/student", label: "Dashboard", icon: <Bus className="size-3.5" /> },
    { to: "/scan", label: "Scan", icon: <ScanLine className="size-3.5" /> },
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

          <div className="bg-primary text-primary-foreground rounded-3xl p-6 text-center shadow-lg shadow-primary/20">
            <p className="text-[10px] uppercase tracking-widest opacity-60 mb-3">Boarding QR</p>
            <div className="bg-white p-3 rounded-2xl inline-block mb-4">
              {qr && <img src={qr} alt="QR" className="size-40" />}
            </div>
            <p className="font-display font-bold text-lg">Scan at the bus terminal</p>
            <p className="text-xs opacity-70 mt-1">Or open scanner from any device</p>
            <Link to="/scan" className="mt-4 inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold">
              <ScanLine className="size-4" /> Open Scanner
            </Link>
          </div>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard label="Assigned Seat" value={me.seatNo} hint="Auto-allocated" tone="primary" icon={<Armchair className="size-4" />} />
            <StatCard label="Fee Status" value={me.feesPaid ? "PAID" : "DUE"} hint={`Fare ₹${route?.fare ?? 0}/sem`} tone={me.feesPaid ? "success" : "danger"} icon={<Wallet className="size-4" />} />
            <StatCard label="Attendance" value={`${attRate}%`} hint={`${myAttendance.length} scans`} tone="accent" icon={<QrCode className="size-4" />} />
          </div>

          {!me.feesPaid && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">Semester fees pending</p>
                <p className="text-sm text-muted-foreground">Pay ₹{route?.fare ?? 0} to confirm your seat allocation.</p>
              </div>
              <button onClick={() => payFees(me.id, route?.fare ?? 4500)} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
                Pay ₹{route?.fare ?? 0}
              </button>
            </div>
          )}

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-end mb-5">
              <div>
                <h3 className="font-display text-xl font-extrabold text-foreground">{route?.name}</h3>
                <p className="text-sm text-muted-foreground">Live seat occupancy</p>
              </div>
            </div>
            <SeatGrid routeId={me.routeId} highlightStudentId={me.id} />
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h4 className="font-display font-bold mb-4 flex items-center gap-2"><History className="size-4" /> Attendance &amp; Payments</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Recent scans</p>
                <div className="space-y-2">
                  {myAttendance.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-muted rounded-xl text-sm">
                      <div className="flex items-center gap-2">
                        {a.verified ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
                        <span className="font-medium capitalize">{a.type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</span>
                    </div>
                  ))}
                  {myAttendance.length === 0 && <p className="text-sm text-muted-foreground">No scans yet — open the scanner to mark entry.</p>}
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
