const BASE = "/api";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const json = await res.json() as unknown;
    if (!res.ok) {
      return { ok: false, error: (json as { error?: string })?.error ?? `Error ${res.status}` };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Network error" };
  }
}

export type ApiStudent = {
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
  photo: string | null;
  feesPaid: boolean;
  createdAt: number;
};

export type ApiTrip = {
  id: string;
  busId: string;
  routeId: string;
  status: "active" | "ended";
  startedAt: number;
  endedAt?: number | null;
};

export const api = {
  students: {
    register: (data: {
      name: string; rollNo: string; branch: string; semester: string;
      phone: string; parentPhone: string; routeId: string; pickupPoint: string;
      photo?: string; password: string;
    }) => call<ApiStudent>("/students/register", { method: "POST", body: JSON.stringify(data) }),

    login: (rollNo: string, password: string) =>
      call<ApiStudent>("/students/login", { method: "POST", body: JSON.stringify({ rollNo, password }) }),

    list: () => call<ApiStudent[]>("/students"),

    update: (id: string, data: { feesPaid?: boolean; seatNo?: string; photo?: string }) =>
      call<{ ok: boolean }>(`/students/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

    remove: (id: string) =>
      call<{ ok: boolean }>(`/students/${id}`, { method: "DELETE" }),
  },

  trips: {
    start: (busId: string, routeId: string) =>
      call<ApiTrip>("/trips/start", { method: "POST", body: JSON.stringify({ busId, routeId }) }),

    end: (busId: string) =>
      call<{ ok: boolean }>("/trips/end", { method: "POST", body: JSON.stringify({ busId }) }),

    getActive: (busId: string) =>
      call<ApiTrip | null>(`/trips/active/${busId}`),
  },

  attendance: {
    log: (data: { id: string; studentId: string; type: string; ts: number; busId: string; verified: boolean; conductorOverride?: boolean }) =>
      call<{ ok: boolean }>("/attendance", { method: "POST", body: JSON.stringify(data) }),
    list: () => call<unknown[]>("/attendance"),
  },

  payments: {
    pay: (id: string, studentId: string, amount: number, ts: number) =>
      call<{ ok: boolean }>("/payments", { method: "POST", body: JSON.stringify({ id, studentId, amount, ts }) }),
  },

  suspicious: {
    flag: (data: { id: string; studentId: string; reason: string; ts: number; busId: string; capturedImage?: string; seatNo?: string }) =>
      call<{ id: string }>("/suspicious", { method: "POST", body: JSON.stringify(data) }),
    resolve: (id: string) => call<{ ok: boolean }>(`/suspicious/${id}/resolve`, { method: "PATCH" }),
  },

  overrides: {
    add: (data: { id: string; suspiciousEntryId: string; studentId: string; conductorName: string; remarks: string; ts: number; attendanceType: string }) =>
      call<{ ok: boolean }>("/overrides", { method: "POST", body: JSON.stringify(data) }),
  },
};
