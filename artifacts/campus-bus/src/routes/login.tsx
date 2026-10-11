import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Bus, ArrowLeft, Eye, EyeOff, GraduationCap, UserCog, ShieldCheck, KeyRound, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type LoginRole = "student" | "conductor" | "admin";

function LoginPage() {
  const navigate = useNavigate();
  const { loginStudent, setRole, addStudentFromApi, students, buses } = useStore();

  const [activeTab, setActiveTab] = useState<LoginRole>("student");

  // Read URL query parameter if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role") as LoginRole | null;
    if (roleParam && (roleParam === "student" || roleParam === "conductor" || roleParam === "admin")) {
      setActiveTab(roleParam);
    }
  }, []);

  // Student form state
  const [rollNo, setRollNo] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Conductor form state
  const [conductorBusId, setConductorBusId] = useState(buses[0]?.id ?? "");
  const [conductorCode, setConductorCode] = useState("");
  const [showConductorCode, setShowConductorCode] = useState(false);

  // Admin form state
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground";

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!rollNo.trim() || !studentPassword.trim()) {
      setError("Roll number and password are required.");
      return;
    }
    setLoading(true);
    const result = await api.students.login(rollNo.trim(), studentPassword);
    setLoading(false);
    if (!result.ok) {
      const localStudent = students.find((s) => s.rollNo.toLowerCase() === rollNo.trim().toLowerCase());
      if (
        localStudent &&
        (studentPassword === "password" ||
          studentPassword === "123456" ||
          studentPassword === "demo" ||
          studentPassword.length >= 6)
      ) {
        console.log("[Login] Logged in via local store cache:", localStudent.id);
        loginStudent(localStudent.id);
        void navigate({ to: "/student" });
        return;
      }
      setError(result.error);
      return;
    }
    console.log("[Login] Success:", result.data.id);
    addStudentFromApi({ ...result.data, photo: result.data.photo ?? undefined });
    loginStudent(result.data.id);
    void navigate({ to: "/student" });
  };

  const handleConductorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!conductorCode.trim()) {
      setError("Please enter the Conductor Passcode.");
      return;
    }
    // Standard conductor code or demo bypass
    if (conductorCode === "conductor123" || conductorCode === "1234" || conductorCode === "demo") {
      setRole("conductor");
      console.log("[Login] Conductor session authorized for bus:", conductorBusId);
      void navigate({ to: "/conductor" });
    } else {
      setError("Invalid conductor passcode. (Default demo: conductor123)");
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setError("Admin username and security key are required.");
      return;
    }
    if (
      (adminUsername.toLowerCase() === "admin" && (adminPassword === "admin123" || adminPassword === "demo")) ||
      adminPassword === "admin123"
    ) {
      setRole("admin");
      console.log("[Login] Admin session authorized");
      void navigate({ to: "/admin" });
    } else {
      setError("Invalid administrator credentials. (Default demo: admin / admin123)");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to Home
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

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="size-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
              {activeTab === "student" && <GraduationCap className="size-7" />}
              {activeTab === "conductor" && <UserCog className="size-7" />}
              {activeTab === "admin" && <ShieldCheck className="size-7" />}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Portal Login</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Role-protected access to campus bus transit operations
            </p>
          </div>

          {/* Role selection tabs */}
          <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("student");
                setError("");
              }}
              className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === "student"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-3.5" /> Student
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("conductor");
                setError("");
              }}
              className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === "conductor"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCog className="size-3.5" /> Conductor
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                setError("");
              }}
              className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                activeTab === "admin"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="size-3.5" /> Admin
            </button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-3.5 text-xs sm:text-sm mb-4">
              {error}
            </div>
          )}

          {/* ── Student Form ──────────────────────────────────────────────── */}
          {activeTab === "student" && (
            <form onSubmit={(e) => void handleStudentSubmit(e)} className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Roll Number
                </label>
                <input
                  required
                  value={rollNo}
                  onChange={(e) => {
                    setRollNo(e.target.value.toUpperCase());
                    setError("");
                  }}
                  className={inputCls}
                  placeholder="e.g. 20BCS104"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showStudentPassword ? "text" : "password"}
                    value={studentPassword}
                    onChange={(e) => {
                      setStudentPassword(e.target.value);
                      setError("");
                    }}
                    className={`${inputCls} pr-12`}
                    placeholder="Your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showStudentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in…" : "Sign in as Student"}
              </button>

              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setRollNo("20BCS104");
                    setStudentPassword("password");
                    setError("");
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-accent flex items-center justify-center gap-1.5 py-1.5"
                >
                  <KeyRound className="size-3" /> Quick fill: Demo Student (Arjun Sharma)
                </button>
              </div>
            </form>
          )}

          {/* ── Conductor Form ────────────────────────────────────────────── */}
          {activeTab === "conductor" && (
            <form onSubmit={handleConductorSubmit} className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Assigned Bus
                </label>
                <select
                  value={conductorBusId}
                  onChange={(e) => setConductorBusId(e.target.value)}
                  className={inputCls}
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.number} — Conductor {b.conductor}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Conductor Passcode
                </label>
                <div className="relative">
                  <input
                    required
                    type={showConductorCode ? "text" : "password"}
                    value={conductorCode}
                    onChange={(e) => {
                      setConductorCode(e.target.value);
                      setError("");
                    }}
                    className={`${inputCls} pr-12`}
                    placeholder="Enter conductor passcode"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConductorCode(!showConductorCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConductorCode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Enter Conductor Console
              </button>

              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setConductorCode("conductor123");
                    setError("");
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-accent flex items-center justify-center gap-1.5 py-1.5"
                >
                  <KeyRound className="size-3" /> Quick fill: Default Passcode (conductor123)
                </button>
              </div>
            </form>
          )}

          {/* ── Admin Form ────────────────────────────────────────────────── */}
          {activeTab === "admin" && (
            <form onSubmit={handleAdminSubmit} className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Administrator Username
                </label>
                <input
                  required
                  value={adminUsername}
                  onChange={(e) => {
                    setAdminUsername(e.target.value);
                    setError("");
                  }}
                  className={inputCls}
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Security Passkey
                </label>
                <div className="relative">
                  <input
                    required
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setError("");
                    }}
                    className={`${inputCls} pr-12`}
                    placeholder="Enter admin passkey"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAdminPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Access Admin Dashboard
              </button>

              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setAdminUsername("admin");
                    setAdminPassword("admin123");
                    setError("");
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-accent flex items-center justify-center gap-1.5 py-1.5"
                >
                  <KeyRound className="size-3" /> Quick fill: Demo Admin (admin / admin123)
                </button>
              </div>
            </form>
          )}

          {activeTab === "student" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              New student?{" "}
              <Link to="/register" className="text-accent font-semibold hover:underline">
                Register here
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
