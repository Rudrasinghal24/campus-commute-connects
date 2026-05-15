import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bus, GraduationCap, ShieldCheck, UserCog, ArrowRight, ScanFace, MapPin, Fingerprint } from "lucide-react";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { setRole, loginStudent } = useStore();

  const pickRole = (role: "student" | "admin" | "conductor") => {
    if (role === "student") {
      loginStudent("s1");
      void navigate({ to: "/student" });
    } else {
      setRole(role);
      void navigate({ to: role === "admin" ? "/admin" : "/conductor" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
              <Bus className="size-4" />
            </div>
            <span className="font-display text-xl font-extrabold text-foreground">UniRoute</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/register" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:inline">
              Register
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-16 sm:pt-24 pb-12">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <ShieldCheck className="size-3.5" /> AI-verified boarding
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-extrabold leading-[1.05] text-foreground mb-6">
              Campus transit,<br />
              <span className="text-accent">precisely managed.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-8">
              Real-time seat allocation, QR boarding with live face verification, attendance logs and payments — for students, conductors and administrators.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90 transition"
              >
                Register a student <ArrowRight className="size-4" />
              </Link>
              <button
                onClick={() => pickRole("student")}
                className="bg-card border border-border text-foreground px-6 py-3 rounded-xl font-semibold hover:bg-muted transition"
              >
                Demo as student
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-primary text-primary-foreground rounded-3xl p-8 shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 size-48 bg-accent/30 rounded-full blur-3xl" />
              <div className="relative">
                <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Today · Route 10A</p>
                <h3 className="font-display text-2xl font-extrabold mb-6">Morning In-Bound</h3>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <Mini icon={<MapPin className="size-3.5" />} label="Stops" value="04" />
                  <Mini icon={<Fingerprint className="size-3.5" />} label="Boarded" value="32" />
                  <Mini icon={<ScanFace className="size-3.5" />} label="Verified" value="100%" />
                </div>
                <div className="bg-background/10 rounded-2xl p-4 backdrop-blur">
                  <div className="flex items-center justify-between text-xs mb-2 opacity-80">
                    <span>Capacity</span><span>32 / 40</span>
                  </div>
                  <div className="h-2 bg-background/20 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: "80%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-6">Choose your portal</p>
        <div className="grid md:grid-cols-3 gap-5">
          <RoleCard
            icon={<GraduationCap className="size-6" />}
            title="Student"
            desc="View seat, pay fees, scan QR for entry/exit, attendance history."
            tone="accent"
            onClick={() => pickRole("student")}
          />
          <RoleCard
            icon={<UserCog className="size-6" />}
            title="Conductor"
            desc="Live student list, manual attendance, occupied seats, scanner."
            tone="primary"
            onClick={() => pickRole("conductor")}
          />
          <RoleCard
            icon={<ShieldCheck className="size-6" />}
            title="Admin"
            desc="Manage buses, routes, students, payments, suspicious entries."
            tone="primary"
            onClick={() => pickRole("admin")}
          />
        </div>
      </section>

      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between text-xs text-muted-foreground">
          <span>© UniRoute · Campus Mobility</span>
          <span>v1.0 · Demo data</span>
        </div>
      </footer>
    </div>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-background/10 rounded-xl p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-70 mb-1">
        {icon} {label}
      </div>
      <p className="font-display font-extrabold text-xl">{value}</p>
    </div>
  );
}

function RoleCard({
  icon, title, desc, tone, onClick,
}: { icon: React.ReactNode; title: string; desc: string; tone: "primary" | "accent"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-card border border-border rounded-3xl p-6 hover:border-accent hover:shadow-lg hover:shadow-accent/10 transition group"
    >
      <div className={`size-12 rounded-2xl flex items-center justify-center mb-5 ${
        tone === "accent" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
      }`}>
        {icon}
      </div>
      <h3 className="font-display text-xl font-extrabold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{desc}</p>
      <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
        Enter <ArrowRight className="size-3.5" />
      </span>
    </button>
  );
}
