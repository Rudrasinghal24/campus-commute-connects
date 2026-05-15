import { Router } from "express";
import { db } from "@workspace/db";
import { suspiciousEntriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const { id, studentId, reason, ts, busId, capturedImage, seatNo } = req.body as {
    id: string; studentId: string; reason: string; ts: number;
    busId: string; capturedImage?: string; seatNo?: string;
  };
  if (!id || !studentId || !reason || !ts || !busId) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }
  try {
    await db.insert(suspiciousEntriesTable).values({
      id, studentId, reason, ts, busId,
      capturedImage: capturedImage ?? null,
      seatNo: seatNo ?? null,
      resolved: false,
    });
    req.log.warn({ id, studentId, reason }, "Suspicious entry flagged");
    res.status(201).json({ id });
  } catch (err) {
    req.log.error({ err }, "Failed to flag suspicious entry");
    res.status(500).json({ error: "Failed to flag suspicious entry." });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(suspiciousEntriesTable)
      .orderBy(suspiciousEntriesTable.ts);
    res.json(rows.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to fetch suspicious entries");
    res.status(500).json({ error: "Failed to fetch suspicious entries." });
  }
});

router.patch("/:id/resolve", async (req, res) => {
  try {
    await db.update(suspiciousEntriesTable)
      .set({ resolved: true })
      .where(eq(suspiciousEntriesTable.id, req.params.id));
    req.log.info({ id: req.params.id }, "Suspicious entry resolved");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to resolve suspicious entry");
    res.status(500).json({ error: "Failed to resolve." });
  }
});

export default router;
