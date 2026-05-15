import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceLogsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const { id, studentId, type, ts, busId, verified, conductorOverride } = req.body as {
    id: string; studentId: string; type: string; ts: number;
    busId: string; verified: boolean; conductorOverride?: boolean;
  };
  if (!id || !studentId || !type || !ts || !busId) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }
  try {
    await db.insert(attendanceLogsTable).values({
      id, studentId, type, ts, busId,
      verified: verified ?? false,
      conductorOverride: conductorOverride ?? false,
    });
    req.log.info({ id, studentId, type, verified }, "Attendance logged");
    res.status(201).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to log attendance");
    res.status(500).json({ error: "Failed to log attendance." });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(attendanceLogsTable)
      .orderBy(attendanceLogsTable.ts);
    res.json(rows.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to fetch attendance");
    res.status(500).json({ error: "Failed to fetch attendance." });
  }
});

router.get("/student/:studentId", async (req, res) => {
  try {
    const rows = await db.select().from(attendanceLogsTable)
      .where(eq(attendanceLogsTable.studentId, req.params.studentId));
    res.json(rows.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to fetch attendance for student");
    res.status(500).json({ error: "Failed to fetch attendance." });
  }
});

export default router;
