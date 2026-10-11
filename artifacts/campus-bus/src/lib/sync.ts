import { firestore } from "./firebase";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import type { Student, Trip, AttendanceLog, Payment, SuspiciousEntry, ConductorOverride } from "./store";

export const cloudSync = {
  async saveStudent(student: Student) {
    try {
      await setDoc(doc(firestore, "students", student.id), {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        branch: student.branch,
        semester: student.semester,
        phone: student.phone,
        parentPhone: student.parentPhone,
        routeId: student.routeId,
        pickupPoint: student.pickupPoint,
        seatNo: student.seatNo,
        photo: student.photo ?? null,
        feesPaid: student.feesPaid,
        createdAt: Date.now(),
      });
      console.log("[CloudSync] Student saved to Firestore:", student.id);
    } catch (e) {
      console.warn("[CloudSync] Background save student failed:", e);
    }
  },

  async deleteStudent(studentId: string) {
    try {
      await deleteDoc(doc(firestore, "students", studentId));
      console.log("[CloudSync] Student deleted from Firestore:", studentId);
    } catch (e) {
      console.warn("[CloudSync] Background delete student failed:", e);
    }
  },

  async saveTrip(trip: Trip) {
    try {
      await setDoc(doc(firestore, "trips", trip.id), {
        id: trip.id,
        busId: trip.busId,
        routeId: trip.routeId,
        status: trip.status,
        startedAt: trip.startedAt,
        endedAt: trip.endedAt ?? null,
      });
      console.log("[CloudSync] Trip saved to Firestore:", trip.id);
    } catch (e) {
      console.warn("[CloudSync] Background save trip failed:", e);
    }
  },

  async saveAttendance(att: AttendanceLog) {
    try {
      await setDoc(doc(firestore, "attendance_logs", att.id), {
        id: att.id,
        studentId: att.studentId,
        type: att.type,
        ts: att.ts,
        busId: att.busId,
        verified: att.verified,
        conductorOverride: att.conductorOverride ?? false,
      });
      console.log("[CloudSync] Attendance saved to Firestore:", att.id);
    } catch (e) {
      console.warn("[CloudSync] Background save attendance failed:", e);
    }
  },

  async saveSuspicious(entry: SuspiciousEntry) {
    try {
      await setDoc(doc(firestore, "suspicious_entries", entry.id), {
        id: entry.id,
        studentId: entry.studentId,
        reason: entry.reason,
        ts: entry.ts,
        busId: entry.busId,
        capturedImage: entry.capturedImage ?? null,
        seatNo: entry.seatNo ?? null,
        resolved: entry.resolved ?? false,
      });
      console.log("[CloudSync] Suspicious entry saved to Firestore:", entry.id);
    } catch (e) {
      console.warn("[CloudSync] Background save suspicious entry failed:", e);
    }
  },

  async savePayment(payment: Payment) {
    try {
      await setDoc(doc(firestore, "payments", payment.id), {
        id: payment.id,
        studentId: payment.studentId,
        amount: payment.amount,
        ts: payment.ts,
        status: payment.status,
      });
      console.log("[CloudSync] Payment saved to Firestore:", payment.id);
    } catch (e) {
      console.warn("[CloudSync] Background save payment failed:", e);
    }
  },

  async saveOverride(ov: ConductorOverride) {
    try {
      await setDoc(doc(firestore, "conductor_overrides", ov.id), {
        id: ov.id,
        suspiciousEntryId: ov.suspiciousEntryId,
        studentId: ov.studentId,
        conductorName: ov.conductorName,
        remarks: ov.remarks,
        ts: ov.ts,
        attendanceType: ov.attendanceType,
      });
      console.log("[CloudSync] Conductor override saved to Firestore:", ov.id);
    } catch (e) {
      console.warn("[CloudSync] Background save override failed:", e);
    }
  },

  async fetchRemoteStudents(): Promise<Student[] | null> {
    try {
      const snap = await getDocs(collection(firestore, "students"));
      if (snap.empty) return null;
      const list: Student[] = [];
      snap.forEach((d) => {
        const data = d.data() as Student;
        list.push({
          id: data.id || d.id,
          name: data.name,
          rollNo: data.rollNo,
          branch: data.branch,
          semester: data.semester,
          phone: data.phone,
          parentPhone: data.parentPhone,
          routeId: data.routeId,
          pickupPoint: data.pickupPoint,
          seatNo: data.seatNo,
          photo: data.photo,
          feesPaid: data.feesPaid ?? false,
        });
      });
      return list;
    } catch (e) {
      console.warn("[CloudSync] Fetch remote students error:", e);
      return null;
    }
  },
};
