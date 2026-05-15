import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "student" | "admin" | "conductor" | null;

export type Student = {
  id: string;
  name: string;
  rollNo: string;
  branch: string;
  semester: string;
  phone: string;
  parentPhone: string;
  routeId: string;
  pickupPoint: string;
  seatNo: string;
  photo?: string;
  feesPaid: boolean;
};

export type Bus = {
  id: string;
  number: string;
  capacity: number;
  routeId: string;
  driver: string;
  conductor: string;
};

export type Route = {
  id: string;
  name: string;
  stops: string[];
  fare: number;
};

export type AttendanceLog = {
  id: string;
  studentId: string;
  type: "entry" | "exit";
  ts: number;
  busId: string;
  verified: boolean;
  conductorOverride?: boolean;
};

export type Payment = {
  id: string;
  studentId: string;
  amount: number;
  ts: number;
  status: "paid" | "pending";
};

export type SuspiciousEntry = {
  id: string;
  studentId: string;
  reason: string;
  ts: number;
  busId: string;
  capturedImage?: string;
  seatNo?: string;
  resolved?: boolean;
};

export type ConductorOverride = {
  id: string;
  suspiciousEntryId: string;
  studentId: string;
  conductorName: string;
  remarks: string;
  ts: number;
  attendanceType: "entry" | "exit";
};

export type AddStudentResult =
  | { ok: true; student: Student }
  | { ok: false; error: string };

type State = {
  role: Role;
  currentStudentId: string | null;
  students: Student[];
  buses: Bus[];
  routes: Route[];
  attendance: AttendanceLog[];
  payments: Payment[];
  suspicious: SuspiciousEntry[];
  overrides: ConductorOverride[];

  setRole: (r: Role) => void;
  loginStudent: (id: string) => void;
  logout: () => void;
  addStudent: (s: Omit<Student, "id" | "seatNo" | "feesPaid">) => AddStudentResult;
  updateStudent: (id: string, p: Partial<Student>) => void;
  addBus: (b: Omit<Bus, "id">) => void;
  removeBus: (id: string) => void;
  addRoute: (r: Omit<Route, "id">) => void;
  removeRoute: (id: string) => void;
  assignSeat: (studentId: string, seatNo: string) => void;
  logAttendance: (studentId: string, type: "entry" | "exit", verified: boolean, conductorOverride?: boolean) => void;
  payFees: (studentId: string, amount: number) => void;
  flagSuspicious: (studentId: string, reason: string, busId: string, capturedImage?: string, seatNo?: string) => string;
  addOverride: (suspiciousEntryId: string, studentId: string, conductorName: string, remarks: string, attendanceType: "entry" | "exit") => void;
  resolveSuspicious: (id: string) => void;
};

const seedRoutes: Route[] = [
  { id: "r1", name: "Route 10A — North Campus", stops: ["Green Park", "Hauz Khas", "AIIMS", "Campus Gate"], fare: 4500 },
  { id: "r2", name: "Route 22B — South Campus", stops: ["Saket", "Malviya Nagar", "INA", "Campus Gate"], fare: 4500 },
  { id: "r3", name: "Route 07X — East Express", stops: ["Mayur Vihar", "Akshardham", "ITO", "Campus Gate"], fare: 5000 },
];

const seedBuses: Bus[] = [
  { id: "b1", number: "DL-10A-1042", capacity: 40, routeId: "r1", driver: "R. Kumar", conductor: "A. Singh" },
  { id: "b2", number: "DL-22B-2210", capacity: 40, routeId: "r2", driver: "M. Yadav", conductor: "P. Verma" },
  { id: "b3", number: "DL-07X-3399", capacity: 36, routeId: "r3", driver: "S. Rao", conductor: "K. Joshi" },
];

const seedStudents: Student[] = [
  { id: "s1", name: "Arjun Sharma", rollNo: "20BCS104", branch: "CSE", semester: "6", phone: "9876543210", parentPhone: "9876500001", routeId: "r1", pickupPoint: "Green Park", seatNo: "12C", feesPaid: true },
  { id: "s2", name: "Priya Patel", rollNo: "20BEC087", branch: "ECE", semester: "6", phone: "9876543211", parentPhone: "9876500002", routeId: "r1", pickupPoint: "Hauz Khas", seatNo: "08A", feesPaid: true },
  { id: "s3", name: "Rohan Mehta", rollNo: "21BME213", branch: "ME", semester: "4", phone: "9876543212", parentPhone: "9876500003", routeId: "r2", pickupPoint: "Saket", seatNo: "15B", feesPaid: false },
  { id: "s4", name: "Sara Iyer", rollNo: "21BCS411", branch: "CSE", semester: "4", phone: "9876543213", parentPhone: "9876500004", routeId: "r2", pickupPoint: "Malviya Nagar", seatNo: "22D", feesPaid: true },
  { id: "s5", name: "Karan Gupta", rollNo: "22BEE065", branch: "EE", semester: "2", phone: "9876543214", parentPhone: "9876500005", routeId: "r3", pickupPoint: "Mayur Vihar", seatNo: "03A", feesPaid: true },
];

const now = Date.now();
const seedAttendance: AttendanceLog[] = [
  { id: "a1", studentId: "s1", type: "entry", ts: now - 1000 * 60 * 60 * 5, busId: "b1", verified: true },
  { id: "a2", studentId: "s1", type: "exit", ts: now - 1000 * 60 * 60 * 2, busId: "b1", verified: true },
  { id: "a3", studentId: "s2", type: "entry", ts: now - 1000 * 60 * 60 * 5, busId: "b1", verified: true },
];

const seedPayments: Payment[] = [
  { id: "p1", studentId: "s1", amount: 4500, ts: now - 1000 * 60 * 60 * 24 * 30, status: "paid" },
  { id: "p2", studentId: "s2", amount: 4500, ts: now - 1000 * 60 * 60 * 24 * 28, status: "paid" },
  { id: "p3", studentId: "s4", amount: 4500, ts: now - 1000 * 60 * 60 * 24 * 10, status: "paid" },
  { id: "p4", studentId: "s5", amount: 5000, ts: now - 1000 * 60 * 60 * 24 * 5, status: "paid" },
];

const seedSuspicious: SuspiciousEntry[] = [
  { id: "x1", studentId: "s3", reason: "Face mismatch after 3 retries", ts: now - 1000 * 60 * 60 * 26, busId: "b2", resolved: false },
];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      role: null,
      currentStudentId: "s1",
      students: seedStudents,
      buses: seedBuses,
      routes: seedRoutes,
      attendance: seedAttendance,
      payments: seedPayments,
      suspicious: seedSuspicious,
      overrides: [],

      setRole: (r) => set({ role: r }),
      loginStudent: (id) => set({ role: "student", currentStudentId: id }),
      logout: () => set({ role: null, currentStudentId: null }),

      addStudent: (s) => {
        const existing = get().students;

        if (!s.name.trim()) return { ok: false, error: "Full name is required." };
        if (!s.rollNo.trim()) return { ok: false, error: "Roll number is required." };
        if (!/^\d{10}$/.test(s.phone)) return { ok: false, error: "Student mobile must be a valid 10-digit number." };
        if (!/^\d{10}$/.test(s.parentPhone)) return { ok: false, error: "Parent mobile must be a valid 10-digit number." };
        if (s.phone === s.parentPhone) return { ok: false, error: "Student and parent mobile numbers must be different." };
        if (!s.routeId) return { ok: false, error: "Please select a bus route." };
        if (!s.pickupPoint) return { ok: false, error: "Please select a pickup point." };

        if (existing.some((x) => x.rollNo.toLowerCase() === s.rollNo.toLowerCase())) {
          return { ok: false, error: `Roll number ${s.rollNo} is already registered.` };
        }
        if (existing.some((x) => x.phone === s.phone)) {
          return { ok: false, error: "This student mobile number is already registered." };
        }
        if (existing.some((x) => x.parentPhone === s.parentPhone)) {
          return { ok: false, error: "This parent mobile number is already registered." };
        }

        const id = "s" + (existing.length + 1) + "_" + Date.now();
        const used = new Set(existing.filter((x) => x.routeId === s.routeId).map((x) => x.seatNo));
        let seat = "";
        for (let row = 1; row <= 20 && !seat; row++) {
          for (const col of ["A", "B", "C", "D"]) {
            const candidate = `${row.toString().padStart(2, "0")}${col}`;
            if (!used.has(candidate)) { seat = candidate; break; }
          }
        }
        const student: Student = { ...s, id, seatNo: seat || "—", feesPaid: false };
        set({ students: [...existing, student] });
        return { ok: true, student };
      },

      updateStudent: (id, p) =>
        set({ students: get().students.map((s) => (s.id === id ? { ...s, ...p } : s)) }),

      addBus: (b) => set({ buses: [...get().buses, { ...b, id: "b_" + Date.now() }] }),
      removeBus: (id) => set({ buses: get().buses.filter((b) => b.id !== id) }),
      addRoute: (r) => set({ routes: [...get().routes, { ...r, id: "r_" + Date.now() }] }),
      removeRoute: (id) => set({ routes: get().routes.filter((r) => r.id !== id) }),

      assignSeat: (studentId, seatNo) =>
        set({ students: get().students.map((s) => (s.id === studentId ? { ...s, seatNo } : s)) }),

      logAttendance: (studentId, type, verified, conductorOverride) => {
        const student = get().students.find((s) => s.id === studentId);
        if (!student) return;
        const bus = get().buses.find((b) => b.routeId === student.routeId);
        set({
          attendance: [
            { id: "a_" + Date.now(), studentId, type, ts: Date.now(), busId: bus?.id ?? "", verified, conductorOverride: conductorOverride ?? false },
            ...get().attendance,
          ],
        });
      },

      payFees: (studentId, amount) => {
        set({
          payments: [
            { id: "p_" + Date.now(), studentId, amount, ts: Date.now(), status: "paid" },
            ...get().payments,
          ],
          students: get().students.map((s) => (s.id === studentId ? { ...s, feesPaid: true } : s)),
        });
      },

      flagSuspicious: (studentId, reason, busId, capturedImage, seatNo) => {
        const id = "x_" + Date.now();
        const student = get().students.find((s) => s.id === studentId);
        set({
          suspicious: [
            { id, studentId, reason, ts: Date.now(), busId, capturedImage, seatNo: seatNo ?? student?.seatNo, resolved: false },
            ...get().suspicious,
          ],
        });
        return id;
      },

      addOverride: (suspiciousEntryId, studentId, conductorName, remarks, attendanceType) => {
        const id = "ov_" + Date.now();
        set({
          overrides: [
            { id, suspiciousEntryId, studentId, conductorName, remarks, ts: Date.now(), attendanceType },
            ...get().overrides,
          ],
          suspicious: get().suspicious.map((x) =>
            x.id === suspiciousEntryId ? { ...x, resolved: true } : x
          ),
        });
        const student = get().students.find((s) => s.id === studentId);
        if (student) {
          const bus = get().buses.find((b) => b.routeId === student.routeId);
          set({
            attendance: [
              { id: "a_ov_" + Date.now(), studentId, type: attendanceType, ts: Date.now(), busId: bus?.id ?? "", verified: false, conductorOverride: true },
              ...get().attendance,
            ],
          });
        }
      },

      resolveSuspicious: (id) =>
        set({ suspicious: get().suspicious.map((x) => (x.id === id ? { ...x, resolved: true } : x)) }),
    }),
    { name: "uniroute-store-v2" }
  )
);
