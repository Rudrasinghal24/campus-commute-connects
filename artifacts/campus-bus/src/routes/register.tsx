import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Bus, ArrowLeft, Camera } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { routes, addStudent, loginStudent } = useStore();
  const [photo, setPhoto] = useState<string | undefined>();
  const [form, setForm] = useState({
    name: "", rollNo: "", branch: "CSE", semester: "1",
    phone: "", parentPhone: "", routeId: routes[0]?.id ?? "", pickupPoint: "",
  });

  const handlePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const route = routes.find((r) => r.id === form.routeId);
    const s = addStudent({ ...form, pickupPoint: form.pickupPoint || route?.stops[0] || "—", photo });
    loginStudent(s.id);
    void navigate({ to: "/student" });
  };

  const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground"><Bus className="size-4" /></div>
            <span className="font-display font-extrabold">UniRoute</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <h1 className="font-display text-3xl font-extrabold mb-1">Student Registration</h1>
        <p className="text-muted-foreground mb-8">A unique seat is assigned automatically on submission.</p>

        <form onSubmit={submit} className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <label className="size-28 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer shrink-0 hover:border-accent transition">
              {photo ? (
                <img src={photo} alt="Profile" className="size-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Camera className="size-6 mx-auto mb-1" />
                  <span className="text-[10px] uppercase font-bold">Photo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
            </label>
            <div className="flex-1 grid sm:grid-cols-2 gap-4 w-full">
              <div>
                <label className={labelCls}>Full name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Arjun Sharma" />
              </div>
              <div>
                <label className={labelCls}>Roll number</label>
                <input required value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} className={inputCls} placeholder="20BCS104" />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Branch</label>
              <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className={inputCls}>
                {["CSE", "ECE", "ME", "EE", "CE", "IT"].map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Semester</label>
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className={inputCls}>
                {Array.from({ length: 8 }, (_, i) => `${i + 1}`).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="9876543210" />
            </div>
            <div>
              <label className={labelCls}>Parent&apos;s phone</label>
              <input required value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className={inputCls} placeholder="9876500001" />
            </div>
            <div>
              <label className={labelCls}>Bus route</label>
              <select value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value, pickupPoint: "" })} className={inputCls}>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pickup point</label>
              <select value={form.pickupPoint} onChange={(e) => setForm({ ...form, pickupPoint: e.target.value })} className={inputCls}>
                <option value="">Select stop…</option>
                {routes.find((r) => r.id === form.routeId)?.stops.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition">
            Complete registration &amp; assign seat
          </button>
        </form>
      </main>
    </div>
  );
}
