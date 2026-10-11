import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Bus, ArrowLeft, CheckCircle2, Armchair, MapPin, Wallet, User, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FaceCapture, compareFaceImages } from "@/components/face-capture";

export const Route = createFileRoute("/register")({
  component: Register,
});

type Step = "form" | "camera" | "success";

type FormData = {
  name: string;
  rollNo: string;
  branch: string;
  semester: string;
  phone: string;
  parentPhone: string;
  routeId: string;
  pickupPoint: string;
  password: string;
  confirmPassword: string;
};

function Register() {
  const navigate = useNavigate();
  const { routes, loginStudent, addStudentFromApi, students, flagSuspicious } = useStore();
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState<FormData>({
    name: "", rollNo: "", branch: "CSE", semester: "1",
    phone: "", parentPhone: "", routeId: routes[0]?.id ?? "",
    pickupPoint: "", password: "", confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData | "general", string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registeredInfo, setRegisteredInfo] = useState<{ name: string; rollNo: string; seatNo: string; route: string; fare: number } | null>(null);
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingLabel, setSubmittingLabel] = useState("");

  const inputCls = (field: keyof FormData) =>
    `w-full bg-card border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground ${formErrors[field] ? "border-destructive" : "border-border"}`;
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block";

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (!formData.rollNo.trim()) errors.rollNo = "Roll number is required";
    if (!/^\d{10}$/.test(formData.phone)) errors.phone = "Must be a valid 10-digit number";
    if (!/^\d{10}$/.test(formData.parentPhone)) errors.parentPhone = "Must be a valid 10-digit number";
    if (formData.phone === formData.parentPhone) errors.parentPhone = "Must differ from student mobile";
    if (!formData.pickupPoint) errors.pickupPoint = "Select a pickup point";
    if (formData.password.length < 6) errors.password = "Minimum 6 characters";
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    if (validate()) setStep("camera");
  };

  const handleCapture = async (photoDataUrl: string) => {
    if (submitting) return;
    setSubmitting(true);
    setApiError("");

    try {
      // ── Step 1: Check for duplicate face ────────────────────────────────
      const studentsWithPhotos = students.filter((s) => s.photo && s.photo.startsWith("data:"));
      if (studentsWithPhotos.length > 0) {
        setSubmittingLabel(`Checking for duplicate faces (0/${studentsWithPhotos.length})…`);
        for (let i = 0; i < studentsWithPhotos.length; i++) {
          const s = studentsWithPhotos[i]!;
          setSubmittingLabel(`Checking for duplicate faces (${i + 1}/${studentsWithPhotos.length})…`);
          const score = await compareFaceImages(s.photo!, photoDataUrl);
          console.log(`[Register] Face duplicate check vs ${s.rollNo}: score=${score.toFixed(3)}`);
          if (score >= 0.82) {
            console.warn(`[Register] Duplicate face detected! Matches ${s.rollNo} with score=${score.toFixed(3)}`);
            const bus = s ? undefined : undefined;
            flagSuspicious(
              s.id,
              `Duplicate face registration attempt — new registrant: ${formData.name} (${formData.rollNo})`,
              bus ?? "unknown",
              photoDataUrl,
              s.seatNo
            );
            api.suspicious.flag({
              id: "x_dup_" + Date.now(),
              studentId: s.id,
              reason: `Duplicate face registration attempt — new registrant: ${formData.name} (${formData.rollNo})`,
              ts: Date.now(),
              busId: "unknown",
              capturedImage: photoDataUrl,
              seatNo: s.seatNo,
            }).catch(console.error);
            setApiError(
              "This face is already registered with another account. If this is an error, contact the administrator."
            );
            setStep("form");
            return;
          }
        }
      }

      // ── Step 2: Register with API ────────────────────────────────────────
      setSubmittingLabel("Saving registration…");
      const pickupPoint = formData.pickupPoint || routes.find((r) => r.id === formData.routeId)?.stops[0] || "";
      console.log("[Register] Submitting registration to API...");
      const result = await api.students.register({
        name: formData.name.trim(),
        rollNo: formData.rollNo.trim(),
        branch: formData.branch,
        semester: formData.semester,
        phone: formData.phone,
        parentPhone: formData.parentPhone,
        routeId: formData.routeId,
        pickupPoint,
        photo: photoDataUrl,
        password: formData.password,
      });

      if (!result.ok) {
        if (result.error.toLowerCase().includes("network") || result.error.includes("500") || result.error.includes("Failed to fetch")) {
          const localRes = useStore.getState().addStudent({
            name: formData.name.trim(),
            rollNo: formData.rollNo.trim(),
            branch: formData.branch,
            semester: formData.semester,
            phone: formData.phone,
            parentPhone: formData.parentPhone,
            routeId: formData.routeId,
            pickupPoint,
            photo: photoDataUrl,
          });
          if (localRes.ok) {
            console.log("[Register] Registered locally via store fallback:", localRes.student.id);
            loginStudent(localRes.student.id);
            const route = routes.find((r) => r.id === formData.routeId);
            setRegisteredInfo({ name: localRes.student.name, rollNo: localRes.student.rollNo, seatNo: localRes.student.seatNo, route: route?.name ?? "—", fare: route?.fare ?? 0 });
            setStep("success");
            return;
          }
        }
        console.error("[Register] API error:", result.error);
        setApiError(result.error);
        setStep("form");
        return;
      }

      console.log("[Register] Registered successfully:", result.data.id);
      addStudentFromApi({ ...result.data, photo: photoDataUrl });
      loginStudent(result.data.id);
      const route = routes.find((r) => r.id === formData.routeId);
      setRegisteredInfo({ name: result.data.name, rollNo: result.data.rollNo, seatNo: result.data.seatNo, route: route?.name ?? "—", fare: route?.fare ?? 0 });
      setStep("success");
    } catch (e) {
      console.error("[Register] Unexpected error:", e);
      setApiError("An unexpected error occurred. Please try again.");
      setStep("form");
    } finally {
      setSubmitting(false);
      setSubmittingLabel("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => (step === "camera" ? setStep("form") : void navigate({ to: "/" }))} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {step === "camera" ? "Back to form" : "Back"}
          </button>
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground"><Bus className="size-4" /></div>
            <span className="font-display font-extrabold">UniRoute</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6">
        <StepIndicator current={step} />

        {step === "form" && (
          <>
            <div className="mb-8">
              <h1 className="font-display text-3xl font-extrabold">Student Registration</h1>
              <p className="text-muted-foreground mt-1">A seat is auto-assigned on completion. Store your password safely.</p>
            </div>
            {apiError && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 text-sm mb-6 flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}
            <form onSubmit={handleFormSubmit} className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full name *</label>
                  <input required value={formData.name} onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors({ ...formErrors, name: undefined }); }} className={inputCls("name")} placeholder="Arjun Sharma" />
                  {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className={labelCls}>Roll number *</label>
                  <input required value={formData.rollNo} onChange={(e) => { setFormData({ ...formData, rollNo: e.target.value.toUpperCase() }); setFormErrors({ ...formErrors, rollNo: undefined }); }} className={inputCls("rollNo")} placeholder="20BCS104" />
                  {formErrors.rollNo && <p className="text-xs text-destructive mt-1">{formErrors.rollNo}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Branch</label>
                  <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} className={inputCls("branch")}>
                    {["CSE", "ECE", "ME", "EE", "CE", "IT"].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Semester</label>
                  <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className={inputCls("semester")}>
                    {Array.from({ length: 8 }, (_, i) => `${i + 1}`).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Student mobile *</label>
                  <input required value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }); setFormErrors({ ...formErrors, phone: undefined }); }} className={inputCls("phone")} placeholder="9876543210" maxLength={10} inputMode="numeric" />
                  {formErrors.phone && <p className="text-xs text-destructive mt-1">{formErrors.phone}</p>}
                </div>
                <div>
                  <label className={labelCls}>Parent mobile *</label>
                  <input required value={formData.parentPhone} onChange={(e) => { setFormData({ ...formData, parentPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }); setFormErrors({ ...formErrors, parentPhone: undefined }); }} className={inputCls("parentPhone")} placeholder="9876500001" maxLength={10} inputMode="numeric" />
                  {formErrors.parentPhone && <p className="text-xs text-destructive mt-1">{formErrors.parentPhone}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Bus route *</label>
                  <select value={formData.routeId} onChange={(e) => setFormData({ ...formData, routeId: e.target.value, pickupPoint: "" })} className={inputCls("routeId")}>
                    {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Pickup point *</label>
                  <select value={formData.pickupPoint} onChange={(e) => { setFormData({ ...formData, pickupPoint: e.target.value }); setFormErrors({ ...formErrors, pickupPoint: undefined }); }} className={inputCls("pickupPoint")}>
                    <option value="">Select stop…</option>
                    {routes.find((r) => r.id === formData.routeId)?.stops.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {formErrors.pickupPoint && <p className="text-xs text-destructive mt-1">{formErrors.pickupPoint}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Password *</label>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setFormErrors({ ...formErrors, password: undefined }); }} className={inputCls("password")} placeholder="Min. 6 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-xs text-destructive mt-1">{formErrors.password}</p>}
                </div>
                <div>
                  <label className={labelCls}>Confirm password *</label>
                  <div className="relative">
                    <input required type={showConfirm ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); setFormErrors({ ...formErrors, confirmPassword: undefined }); }} className={inputCls("confirmPassword")} placeholder="Repeat password" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{formErrors.confirmPassword}</p>}
                </div>
              </div>

              <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                <User className="size-4" /> Continue to face photo
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Already registered? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </form>
          </>
        )}

        {step === "camera" && (
          <>
            <div className="mb-8">
              <h1 className="font-display text-3xl font-extrabold">Face Registration</h1>
              <p className="text-muted-foreground mt-1">Your live photo is used for attendance verification. Only your face — no masks or glasses.</p>
            </div>

            {submitting ? (
              <div className="bg-card border border-border rounded-3xl p-10 text-center">
                <Loader2 className="size-10 animate-spin text-accent mx-auto mb-4" />
                <p className="font-semibold text-foreground">{submittingLabel || "Processing…"}</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a few seconds.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <FaceCapture
                  onCapture={(url) => void handleCapture(url)}
                  hint="Look straight into the camera in good lighting. Your face will be compared against all registered students to prevent duplicate registration."
                  captureLabel="Capture & Register"
                />
              </div>
            )}
          </>
        )}

        {step === "success" && registeredInfo && (
          <>
            <div className="mb-8 text-center">
              <div className="size-16 mx-auto rounded-full bg-success/10 grid place-items-center mb-4">
                <CheckCircle2 className="size-9 text-success" />
              </div>
              <h1 className="font-display text-3xl font-extrabold">Registration Complete!</h1>
              <p className="text-muted-foreground mt-1">You are now registered and logged in.</p>
            </div>
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <InfoRow icon={<User className="size-4" />} label="Name" value={registeredInfo.name} />
              <InfoRow icon={<User className="size-4" />} label="Roll No" value={registeredInfo.rollNo} />
              <InfoRow icon={<Armchair className="size-4" />} label="Seat" value={registeredInfo.seatNo} />
              <InfoRow icon={<MapPin className="size-4" />} label="Route" value={registeredInfo.route} />
              <InfoRow icon={<Wallet className="size-4" />} label="Semester Fare" value={`₹${registeredInfo.fare}`} />
              <div className="pt-2">
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-warning mb-4">
                  Fees unpaid — visit the student dashboard to pay your semester fare and activate boarding access.
                </div>
                <button onClick={() => void navigate({ to: "/student" })} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition">
                  Go to Student Dashboard
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "form", label: "Details" },
    { key: "camera", label: "Face Photo" },
    { key: "success", label: "Done" },
  ];
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1">
          <div className={`size-7 rounded-full text-xs font-bold grid place-items-center shrink-0 transition ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {i + 1}
          </div>
          <span className={`ml-1.5 text-xs font-semibold hidden sm:block transition ${i <= idx ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
          {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 transition ${i < idx ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
