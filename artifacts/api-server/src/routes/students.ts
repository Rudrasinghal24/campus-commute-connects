import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db/schema";
import { eq, ne } from "drizzle-orm";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "uniroute-salt").digest("hex");
}

function allocateSeat(usedSeats: string[]): string {
  const used = new Set(usedSeats);
  for (let row = 1; row <= 20; row++) {
    for (const col of ["A", "B", "C", "D"]) {
      const s = `${row.toString().padStart(2, "0")}${col}`;
      if (!used.has(s)) return s;
    }
  }
  return "—";
}

router.post("/register", async (req, res) => {
  const { name, rollNo, branch, semester, phone, parentPhone, routeId, pickupPoint, photo, password } = req.body as {
    name: string; rollNo: string; branch: string; semester: string;
    phone: string; parentPhone: string; routeId: string; pickupPoint: string;
    photo?: string; password: string;
  };

  if (!name?.trim() || !rollNo?.trim() || !phone?.trim() || !parentPhone?.trim() || !routeId || !pickupPoint || !password?.trim()) {
    res.status(400).json({ error: "All fields are required." });
    return;
  }
  if (!/^\d{10}$/.test(phone)) {
    res.status(400).json({ error: "Student mobile must be 10 digits." });
    return;
  }
  if (!/^\d{10}$/.test(parentPhone)) {
    res.status(400).json({ error: "Parent mobile must be 10 digits." });
    return;
  }
  if (phone === parentPhone) {
    res.status(400).json({ error: "Student and parent mobile numbers must differ." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  try {
    const existing = await db.select({ id: studentsTable.id, rollNo: studentsTable.rollNo, phone: studentsTable.phone, parentPhone: studentsTable.parentPhone })
      .from(studentsTable);

    if (existing.some((s) => s.rollNo.toLowerCase() === rollNo.toLowerCase())) {
      res.status(409).json({ error: `Roll number ${rollNo} is already registered.` });
      return;
    }
    if (existing.some((s) => s.phone === phone)) {
      res.status(409).json({ error: "Student mobile number is already registered." });
      return;
    }
    if (existing.some((s) => s.parentPhone === parentPhone)) {
      res.status(409).json({ error: "Parent mobile number is already registered." });
      return;
    }

    const routeStudents = await db.select({ seatNo: studentsTable.seatNo })
      .from(studentsTable)
      .where(eq(studentsTable.routeId, routeId));

    const seatNo = allocateSeat(routeStudents.map((s) => s.seatNo));
    const id = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    const passwordHash = hashPassword(password);
    const now = Date.now();

    await db.insert(studentsTable).values({
      id, name: name.trim(), rollNo: rollNo.toUpperCase(), branch, semester,
      phone, parentPhone, routeId, pickupPoint, seatNo, photo: photo ?? null,
      feesPaid: false, passwordHash, createdAt: now,
    });

    req.log.info({ studentId: id, rollNo }, "Student registered successfully");
    const { passwordHash: _ph, ...safeStudent } = (await db.select().from(studentsTable).where(eq(studentsTable.id, id)))[0]!;
    res.status(201).json(safeStudent);
  } catch (err) {
    req.log.error({ err }, "Student registration failed");
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const { rollNo, password } = req.body as { rollNo: string; password: string };
  if (!rollNo?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Roll number and password are required." });
    return;
  }
  try {
    const [student] = await db.select().from(studentsTable)
      .where(eq(studentsTable.rollNo, rollNo.toUpperCase()));
    if (!student) {
      res.status(401).json({ error: "Roll number not found." });
      return;
    }
    const hash = hashPassword(password);
    if (hash !== student.passwordHash) {
      req.log.warn({ rollNo }, "Login failed: invalid password");
      res.status(401).json({ error: "Invalid password." });
      return;
    }
    req.log.info({ studentId: student.id, rollNo }, "Student login successful");
    const { passwordHash: _ph, ...safeStudent } = student;
    res.json(safeStudent);
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await db.select({
      id: studentsTable.id, name: studentsTable.name, rollNo: studentsTable.rollNo,
      branch: studentsTable.branch, semester: studentsTable.semester,
      phone: studentsTable.phone, parentPhone: studentsTable.parentPhone,
      routeId: studentsTable.routeId, pickupPoint: studentsTable.pickupPoint,
      seatNo: studentsTable.seatNo, photo: studentsTable.photo,
      feesPaid: studentsTable.feesPaid, createdAt: studentsTable.createdAt,
    }).from(studentsTable);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch students");
    res.status(500).json({ error: "Failed to fetch students." });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { feesPaid, seatNo, photo } = req.body as { feesPaid?: boolean; seatNo?: string; photo?: string };
  try {
    const updates: Partial<typeof studentsTable.$inferInsert> = {};
    if (feesPaid !== undefined) updates.feesPaid = feesPaid;
    if (seatNo !== undefined) updates.seatNo = seatNo;
    if (photo !== undefined) updates.photo = photo;
    await db.update(studentsTable).set(updates).where(eq(studentsTable.id, id));
    req.log.info({ studentId: id, updates: Object.keys(updates) }, "Student updated");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update student");
    res.status(500).json({ error: "Update failed." });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.select({ id: studentsTable.id }).from(studentsTable).where(eq(studentsTable.id, id!));
    if (existing.length === 0) {
      res.status(404).json({ error: "Student not found." });
      return;
    }
    await db.delete(studentsTable).where(eq(studentsTable.id, id!));
    req.log.info({ studentId: id }, "Student removed from database");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to remove student");
    res.status(500).json({ error: "Failed to remove student." });
  }
});

export default router;
