import { Router } from "express";
import { db } from "@workspace/db";
import { conductorOverridesTable, suspiciousEntriesTable, attendanceLogsTable, studentsTable, busesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const { id, suspiciousEntryId, studentId, conductorName, remarks, ts, attendanceType } = req.body as {
    id: string; suspiciousEntryId: string; studentId: string;
    conductorName: string; remarks: string; ts: number; attendanceType: string;
  };
  if (!id || !suspiciousEntryId || !studentId || !conductorName || !ts || !attendanceType) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }
  try {
    await db.insert(conductorOverridesTable).values({
      id, suspiciousEntryId, studentId, conductorName,
      remarks: remarks || "Conductor verified in person",
      ts, attendanceType,
    });
    await db.update(suspiciousEntriesTable)
      .set({ resolved: true })
      .where(eq(suspiciousEntriesTable.id, suspiciousEntryId));

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
    if (student) {
      const [bus] = await db.select().from(busesTable).where(eq(busesTable.routeId, student.routeId));
      const attendanceId = "a_ov_" + Date.now();
      await db.insert(attendanceLogsTable).values({
        id: attendanceId, studentId, type: attendanceType, ts,
        busId: bus?.id ?? "", verified: false, conductorOverride: true,
      });
    }

    req.log.info({ id, studentId, conductorName }, "Conductor override recorded");
    res.status(201).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to record override");
    res.status(500).json({ error: "Failed to record override." });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(conductorOverridesTable)
      .orderBy(conductorOverridesTable.ts);
    res.json(rows.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to fetch overrides");
    res.status(500).json({ error: "Failed to fetch overrides." });
  }
});

export default router;
